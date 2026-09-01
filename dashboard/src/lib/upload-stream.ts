import { createWriteStream } from "fs";
import { mkdir, unlink } from "fs/promises";
import { tmpdir } from "os";
import { extname, join } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import Busboy from "busboy";

// Fora de public/: enquanto o arquivo existe no disco ele nao pode ser baixado
// por quem adivinhar a URL -- o Next serve public/ como estatico.
export const TEMP_DIR = join(tmpdir(), "hiddencopy");

export async function garantirTempDir() {
  await mkdir(TEMP_DIR, { recursive: true });
}

/** Erro com status HTTP proprio, pra rota traduzir direto na resposta. */
export class UploadError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = "UploadError";
  }
}

export type ArquivoRecebido = { path: string; filename: string };

export type UploadRecebido = {
  campos: Record<string, string>;
  arquivos: Record<string, ArquivoRecebido>;
  /** Apaga do disco tudo que esta requisicao gravou. */
  limpar: () => Promise<void>;
};

type Opcoes = {
  /** Prefixo dos nomes gravados no disco -- use um id unico por requisicao. */
  prefixo: string;
  maxBytes: number;
  /** Extensao usada quando o nome enviado pelo browser nao tem uma. */
  extensaoPadrao?: Record<string, string>;
};

/**
 * Le um multipart/form-data gravando cada arquivo direto no disco, sem passar
 * pela memoria. E por isso que esta rota nao usa req.formData(): o formData
 * carrega o upload inteiro na RAM (e faz mais uma copia em arrayBuffer), o que
 * derruba o container por OOM em video grande -- e o proxy na frente responde
 * 502 no meio do upload.
 */
export function receberMultipart(
  req: Request,
  { prefixo, maxBytes, extensaoPadrao = {} }: Opcoes
): Promise<UploadRecebido> {
  return new Promise<UploadRecebido>((resolve, reject) => {
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.startsWith("multipart/form-data")) {
      reject(new UploadError(400, "Envio inválido"));
      return;
    }
    if (!req.body) {
      reject(new UploadError(400, "Requisição sem corpo"));
      return;
    }

    const campos: Record<string, string> = {};
    const arquivos: Record<string, ArquivoRecebido> = {};
    const gravacoes: Promise<unknown>[] = [];
    const caminhos: string[] = [];

    const limpar = async () => {
      await Promise.all(caminhos.map((caminho) => unlink(caminho).catch(() => {})));
    };

    const bb = Busboy({
      headers: { "content-type": contentType },
      limits: { fileSize: maxBytes, files: 2, fields: 20 },
    });

    let falha: Error | null = null;
    let finalizado = false;

    // Registra a falha ANTES de destruir o busboy: destroy() dispara 'close',
    // e 'close' precisa enxergar a falha pra rejeitar em vez de resolver com
    // um arquivo pela metade.
    const abortar = (erro: Error) => {
      if (falha) return;
      falha = erro;
      bb.destroy();
    };

    const encerrar = async () => {
      if (finalizado) return;
      finalizado = true;
      // Esperar as gravacoes antes de limpar, senao o unlink corre com um
      // write ainda aberto e o arquivo reaparece no disco depois.
      await Promise.allSettled(gravacoes);
      if (falha) {
        await limpar();
        reject(falha);
      } else {
        resolve({ campos, arquivos, limpar });
      }
    };

    bb.on("field", (nome, valor) => {
      campos[nome] = valor;
    });

    bb.on("file", (nome, stream, info) => {
      const ext = extname(info.filename || "") || extensaoPadrao[nome] || "";
      const destino = join(TEMP_DIR, `${prefixo}_${nome}${ext}`);
      caminhos.push(destino);
      arquivos[nome] = { path: destino, filename: info.filename };

      // 'limit': o busboy corta o arquivo no limite e segue como se tivesse
      // terminado. Sem este handler, gravariamos um video truncado.
      stream.on("limit", () =>
        abortar(
          new UploadError(
            413,
            `Arquivo maior que o limite de ${Math.round(maxBytes / 1024 / 1024)}MB`
          )
        )
      );

      gravacoes.push(
        pipeline(stream, createWriteStream(destino)).catch((erro: Error) => abortar(erro))
      );
    });

    bb.on("error", (erro) => abortar(erro instanceof Error ? erro : new Error(String(erro))));
    bb.on("close", encerrar);

    const origem = Readable.fromWeb(req.body as WebReadableStream<Uint8Array>);
    // pipe() nao propaga erro da origem; sem este handler, um cliente que
    // desconecta no meio do upload deixaria a Promise pendurada pra sempre.
    origem.on("error", (erro: Error) => abortar(erro));
    origem.pipe(bb);
  });
}
