import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = createServerClient(token);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  if (user.email !== process.env.ADMIN_EMAIL) return null;
  return user;
}

// POST - ajustar créditos de um usuário
export async function POST(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const { userId, credits, action } = await req.json();

  if (!userId || credits === undefined) {
    return NextResponse.json({ error: "userId e credits são obrigatórios" }, { status: 400 });
  }

  const supabase = createServiceClient();

  if (action === "set") {
    // Definir créditos para um valor específico
    const { error } = await supabase
      .from("profiles")
      .update({ credits, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  } else {
    // Adicionar créditos (padrão)
    const { data: profile } = await supabase
      .from("profiles")
      .select("credits")
      .eq("id", userId)
      .single();

    const newCredits = (profile?.credits || 0) + credits;

    const { error } = await supabase
      .from("profiles")
      .update({ credits: newCredits, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true });
}
