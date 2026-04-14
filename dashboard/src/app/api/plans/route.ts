import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";

// GET - retorna planos (público)
export async function GET() {
  const supabase = createServiceClient();
  const { data: plans, error } = await supabase
    .from("plans")
    .select("*")
    .order("price", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ plans });
}

// PUT - atualiza planos (admin only)
export async function PUT(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  const supabase = createServerClient(token);

  try {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }
    if (data.user.email !== process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { plans } = await req.json();
  if (!Array.isArray(plans)) {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }

  const serviceClient = createServiceClient();

  for (const plan of plans) {
    const { error } = await serviceClient.from("plans").upsert({
      id: plan.id,
      name: plan.name,
      credits: plan.credits,
      price: plan.price,
      features: plan.features,
      popular: plan.popular,
      icon: plan.icon,
      updated_at: new Date().toISOString(),
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
