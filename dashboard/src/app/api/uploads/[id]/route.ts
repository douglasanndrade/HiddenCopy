import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "fs";
import { stat, unlink } from "fs/promises";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import type { ReadableStream as WebReadableStream } from "stream/web";
import { MAX_BYTES, MAX_UPLOAD_MB, caminhoParcial } from "@/lib/uploads-parciais";

export const runtime = "nodejs";

/**
 * Recebe um pedaco e cola no fim do arquivo em montagem.
 *
 * Nao pede token: o id do upload e um UUID que so quem abriu o envio conhece,
 * e abrir o envio exige conta com credito. Conferir sessao a cada pedaco seria
 * uma ida ao Supabase a cada 8MB.
 *
 * O offset e a posicao onde o cliente acha que parou. Se nao bater com o
 * tamanho real do arquivo, devolve 409 com o tamanho certo e o browser retoma
 * dali -- e assim um pedaco que caiu no meio nao corrompe nem duplica nada.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const caminho = caminhoParcial(id);
    if (!caminho) {
      return NextResponse.json({ error: "Envio inválido" }, { status: 400 });
    }

    let atual;
    try {
      atual = await stat(caminho);
    } catch {
      return NextResponse.json({ error: "Envio não encontrado" }, { status: 404 });
    }

    const offset = Number(req.nextUrl.searchParams.get("offset"));
    if (!Number.isInteger(offset) || offset < 0) {
      return NextResponse.json({ error: "Posição inválida" }, { status: 400 });
    }
    if (offset !== atual.size) {
      return NextResponse.json({ offset: atual.size }, { status: 409 });
    }

    const tamanhoParte = Number(req.headers.get("content-length")) || 0;
    if (atual.size + tamanhoParte > MAX_BYTES) {
      await unlink(caminho).catch(() => {});
      return NextResponse.json(
        { error: `Arquivo maior que o limite de ${MAX_UPLOAD_MB}MB` },
        { status: 413 }
      );
    }

    if (!req.body) {
      return NextResponse.json({ error: "Pedaço vazio" }, { status: 400 });
    }

    await pipeline(
      Readable.fromWeb(req.body as WebReadableStream<Uint8Array>),
      createWriteStream(caminho, { flags: "a" })
    );

    const depois = await stat(caminho);
    return NextResponse.json({ offset: depois.size });
  } catch (err) {
    console.error("Upload parte error:", err);
    return NextResponse.json({ error: "Falha ao enviar o pedaço" }, { status: 500 });
  }
}

/** Cancelamento pelo browser: apaga o que ja subiu. */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const caminho = caminhoParcial(id);
  if (caminho) await unlink(caminho).catch(() => {});
  return NextResponse.json({ ok: true });
}
