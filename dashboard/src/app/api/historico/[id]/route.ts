import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import { Readable } from "stream";
import { autenticar } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { caminhoResultado } from "@/lib/historico";

export const runtime = "nodejs";

type Registro = {
  id: string;
  user_id: string;
  arquivo: string;
  nome_original: string;
};

/**
 * Busca o registro e confere se quem pediu pode mexer nele. Usa a service key
 * (passa por cima do RLS), entao a checagem de dono e feita aqui na mao --
 * admin ve tudo, usuario so o que e dele.
 */
async function buscarPermitido(
  req: NextRequest,
  id: string
): Promise<{ ok: true; registro: Registro } | { ok: false; resposta: NextResponse }> {
  const auth = await autenticar(req, { exigirCredito: false });
  if (!auth.ok) return { ok: false, resposta: auth.resposta };

  const service = createServiceClient();
  const { data } = await service
    .from("processamentos")
    .select("id, user_id, arquivo, nome_original")
    .eq("id", id)
    .single();

  if (!data) {
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Não encontrado" }, { status: 404 }),
    };
  }

  if (!auth.usuario.admin && data.user_id !== auth.usuario.userId) {
    // 404 em vez de 403: nao confirma pra ninguem que o id existe.
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Não encontrado" }, { status: 404 }),
    };
  }

  return { ok: true, registro: data as Registro };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const permitido = await buscarPermitido(req, id);
    if (!permitido.ok) return permitido.resposta;

    const caminho = caminhoResultado(permitido.registro.arquivo);
    if (!caminho) {
      return NextResponse.json({ error: "Arquivo inválido" }, { status: 400 });
    }

    let info;
    try {
      info = await stat(caminho);
    } catch {
      return NextResponse.json(
        { error: "Arquivo não está mais disponível" },
        { status: 410 }
      );
    }

    const arquivo = createReadStream(caminho);
    return new NextResponse(Readable.toWeb(arquivo) as unknown as ReadableStream<Uint8Array>, {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Length": String(info.size),
        "Content-Disposition": `attachment; filename="${permitido.registro.nome_original}"`,
      },
    });
  } catch (err) {
    console.error("Download histórico error:", err);
    return NextResponse.json({ error: "Falha ao baixar" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const permitido = await buscarPermitido(req, id);
    if (!permitido.ok) return permitido.resposta;

    const caminho = caminhoResultado(permitido.registro.arquivo);
    if (caminho) await unlink(caminho).catch(() => {});

    const service = createServiceClient();
    await service.from("processamentos").delete().eq("id", id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Excluir histórico error:", err);
    return NextResponse.json({ error: "Falha ao excluir" }, { status: 500 });
  }
}
