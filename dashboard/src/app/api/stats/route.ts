import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createServerClient(token);

    let user;
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }
      user = data.user;
    } catch {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Buscar uso do mês atual
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const serviceClient = createServiceClient();
    const { data: usage } = await serviceClient
      .from("credit_usage")
      .select("action")
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth);

    const melhorados = usage?.filter((u) => u.action === "melhorar").length || 0;
    const mesclados = usage?.filter((u) => u.action === "mesclar").length || 0;

    return NextResponse.json({ melhorados, mesclados });
  } catch {
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
