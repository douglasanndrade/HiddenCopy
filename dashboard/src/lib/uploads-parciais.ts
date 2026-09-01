import { mkdir } from "fs/promises";
import { tmpdir } from "os";
import { join } from "path";

// Fora de public/: enquanto o arquivo existe no disco ele nao pode ser baixado
// por quem adivinhar a URL -- o Next serve public/ como estatico.
export const TEMP_DIR = join(tmpdir(), "hiddencopy");

export async function garantirTempDir() {
  await mkdir(TEMP_DIR, { recursive: true });
}

// So UUID. O id vira nome de arquivo, entao qualquer coisa com ".." ou "/"
// dentro sairia da pasta temporaria.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 1024;
export const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

/**
 * Tamanho de cada pedaco enviado pelo browser. 8MB leva poucos segundos por
 * requisicao -- o ponto e nunca ter uma requisicao longa o bastante pra algum
 * proxy no caminho desistir dela.
 */
export const TAMANHO_PARTE = 8 * 1024 * 1024;

/** Caminho do arquivo em montagem, ou null se o id nao for um UUID. */
export function caminhoParcial(id: string): string | null {
  if (!UUID.test(id)) return null;
  return join(TEMP_DIR, `${id}.parcial`);
}

/** Extensao segura tirada do nome enviado pelo browser. */
export function extensaoSegura(nome: string | undefined, padrao: string): string {
  if (!nome) return padrao;
  const ponto = nome.lastIndexOf(".");
  if (ponto < 0) return padrao;
  const ext = nome.slice(ponto);
  return /^\.[a-z0-9]{1,5}$/i.test(ext) ? ext.toLowerCase() : padrao;
}
