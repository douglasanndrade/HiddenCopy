import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "./supabase-server";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

export type Usuario = { userId: string | null; credits: number };

type Resultado =
  | { ok: true; usuario: Usuario }
  | { ok: false; resposta: NextResponse };

/**
 * Confere token e creditos. Extraido pra ca porque agora tres rotas precisam
 * disso -- e a de iniciar upload precisa checar ANTES de aceitar 300MB de
 * arquivo, nao depois.
 */
export async function autenticar(req: Request): Promise<Resultado> {
  if (DEV_MODE) return { ok: true, usuario: { userId: null, credits: 0 } };

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createServerClient(token);

  let userId: string;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return {
        ok: false,
        resposta: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
      };
    }
    userId = data.user.id;
  } catch {
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("credits")
    .eq("id", userId)
    .single();

  if (!profile || profile.credits < 1) {
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Créditos insuficientes" }, { status: 403 }),
    };
  }

  return { ok: true, usuario: { userId, credits: profile.credits } };
}

/** Desconta um credito e registra o uso. No-op em modo dev. */
export async function cobrarCredito(usuario: Usuario, acao: string) {
  if (DEV_MODE || !usuario.userId) return;

  const serviceClient = createServiceClient();
  await serviceClient
    .from("profiles")
    .update({
      credits: usuario.credits - 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", usuario.userId);

  await serviceClient.from("credit_usage").insert({
    user_id: usuario.userId,
    action: acao,
    credits_used: 1,
  });
}
