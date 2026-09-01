import { NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "./supabase-server";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

// A sidebar decide quem e admin por NEXT_PUBLIC_ADMIN_EMAIL, e a tabela tem
// is_admin. Aceitar so a coluna faria o admin ver o link e levar 403, porque
// nada garante que ela foi preenchida. Vale qualquer um dos dois.
const EMAILS_ADMIN = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export type Usuario = { userId: string | null; credits: number; admin: boolean };

type Resultado =
  | { ok: true; usuario: Usuario }
  | { ok: false; resposta: NextResponse };

/**
 * Confere token e, por padrao, credito. Extraido pra ca porque varias rotas
 * precisam disso -- e a de iniciar upload precisa checar ANTES de aceitar
 * 300MB de arquivo, nao depois.
 *
 * `exigirCredito: false` para telas de leitura: quem ficou sem credito ainda
 * tem direito de ver e baixar o proprio historico.
 */
export async function autenticar(
  req: Request,
  { exigirCredito = true }: { exigirCredito?: boolean } = {}
): Promise<Resultado> {
  if (DEV_MODE) {
    return { ok: true, usuario: { userId: null, credits: 0, admin: true } };
  }

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
  let email: string;
  try {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      return {
        ok: false,
        resposta: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
      };
    }
    userId = data.user.id;
    email = (data.user.email || "").toLowerCase();
  } catch {
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from("profiles")
    .select("credits, is_admin")
    .eq("id", userId)
    .single();

  if (!profile) {
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Não autenticado" }, { status: 401 }),
    };
  }

  if (exigirCredito && profile.credits < 1) {
    return {
      ok: false,
      resposta: NextResponse.json({ error: "Créditos insuficientes" }, { status: 403 }),
    };
  }

  return {
    ok: true,
    usuario: {
      userId,
      credits: profile.credits,
      admin: profile.is_admin === true || EMAILS_ADMIN.includes(email),
    },
  };
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
