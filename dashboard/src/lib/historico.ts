import { mkdir, unlink } from "fs/promises";
import { join } from "path";
import { createServiceClient } from "./supabase-server";

/**
 * Onde ficam os resultados guardados.
 *
 * Nao pode ser public/ (o Next serviria como estatico, sem checar dono) nem
 * /tmp (some a cada deploy). Em producao o padrao cai em /app/dados, que
 * PRECISA ser um volume montado no painel -- sem volume, o historico some no
 * proximo deploy.
 */
export const DADOS_DIR = process.env.DADOS_DIR || join(process.cwd(), "..", "dados");

export const RETENCAO_DIAS = Number(process.env.RETENCAO_DIAS) || 60;

/** Teto do historico no disco. O VPS tem ~51GB livres; isto deixa folga. */
export const MAX_HISTORICO_GB = Number(process.env.MAX_HISTORICO_GB) || 35;

export async function garantirDadosDir() {
  await mkdir(DADOS_DIR, { recursive: true });
}

// O nome vem do banco, mas vira caminho de arquivo -- entao passa pelo mesmo
// crivo de sempre antes de tocar no disco.
const NOME_ARQUIVO = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.mp4$/i;

export function caminhoResultado(arquivo: string): string | null {
  if (!NOME_ARQUIVO.test(arquivo)) return null;
  return join(DADOS_DIR, arquivo);
}

export function dataExpiracao(): string {
  return new Date(Date.now() + RETENCAO_DIAS * 24 * 60 * 60 * 1000).toISOString();
}

type Linha = { id: string; arquivo: string; tamanho_bytes?: number | string | null };

async function remover(
  service: ReturnType<typeof createServiceClient>,
  linhas: Linha[]
) {
  await Promise.all(
    linhas.map(async (linha) => {
      const caminho = caminhoResultado(linha.arquivo);
      if (caminho) await unlink(caminho).catch(() => {});
    })
  );
  await service
    .from("processamentos")
    .delete()
    .in(
      "id",
      linhas.map((l) => l.id)
    );
}

let ultimaLimpeza = 0;
const INTERVALO_LIMPEZA = 60 * 60 * 1000;

/**
 * Apaga o que passou da retencao e, se ainda assim o historico estiver acima
 * do teto de disco, vai removendo do mais antigo pro mais novo.
 *
 * Nao existe cron dentro do container, entao isto pega carona nas requisicoes
 * -- no maximo uma vez por hora, pra nao pesar em quem esta processando.
 */
export async function limparHistorico(forcar = false) {
  if (!forcar && Date.now() - ultimaLimpeza < INTERVALO_LIMPEZA) return;
  ultimaLimpeza = Date.now();

  try {
    const service = createServiceClient();

    const { data: expirados } = await service
      .from("processamentos")
      .select("id, arquivo")
      .lt("expira_em", new Date().toISOString())
      .limit(500);

    if (expirados?.length) await remover(service, expirados);

    // Teto de disco: a retencao sozinha nao protege se o volume diario subir.
    const { data: todos } = await service
      .from("processamentos")
      .select("id, arquivo, tamanho_bytes")
      .order("criado_em", { ascending: true });

    if (!todos?.length) return;

    let total = todos.reduce((soma, l) => soma + Number(l.tamanho_bytes || 0), 0);
    const teto = MAX_HISTORICO_GB * 1024 ** 3;
    if (total <= teto) return;

    const excedentes: Linha[] = [];
    for (const linha of todos) {
      if (total <= teto) break;
      excedentes.push(linha);
      total -= Number(linha.tamanho_bytes || 0);
    }
    if (excedentes.length) {
      console.log(`[historico] teto de ${MAX_HISTORICO_GB}GB atingido, removendo ${excedentes.length} mais antigos`);
      await remover(service, excedentes);
    }
  } catch (err) {
    // Limpeza nunca pode derrubar a requisicao que a chamou.
    console.error("[historico] limpeza falhou:", err);
  }
}
