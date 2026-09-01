import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import { autenticar } from "@/lib/api-auth";
import {
  MAX_BYTES,
  TAMANHO_PARTE,
  caminhoParcial,
  garantirTempDir,
} from "@/lib/uploads-parciais";

export const runtime = "nodejs";

/**
 * Abre um upload em partes. Autenticacao e credito sao conferidos aqui, antes
 * de o browser mandar o primeiro byte -- assim ninguem ocupa disco sem conta.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await autenticar(req);
    if (!auth.ok) return auth.resposta;

    await garantirTempDir();

    const id = randomUUID();
    const caminho = caminhoParcial(id);
    if (!caminho) {
      return NextResponse.json({ error: "Falha ao abrir o envio" }, { status: 500 });
    }

    await writeFile(caminho, "");

    return NextResponse.json({ id, tamanhoParte: TAMANHO_PARTE, maxBytes: MAX_BYTES });
  } catch (err) {
    console.error("Upload iniciar error:", err);
    return NextResponse.json({ error: "Falha ao abrir o envio" }, { status: 500 });
  }
}
