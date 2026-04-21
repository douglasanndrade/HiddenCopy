import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";
import { createCashIn } from "@/lib/syncpay";

export async function POST(req: NextRequest) {
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

    const { planId, cpf, phone } = await req.json();

    // Buscar plano do banco de dados
    const serviceClient = createServiceClient();
    const { data: plan } = await serviceClient
      .from("plans")
      .select("*")
      .eq("id", planId)
      .single();

    if (!plan) {
      return NextResponse.json({ error: "Plano inválido" }, { status: 400 });
    }

    // Buscar perfil do usuário
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/syncpay`;

    const splitClientId = (process.env.SYNCPAY_PLATFORM_CLIENT_ID || "").trim() || null;
    const rawPercentage = parseInt(process.env.SYNCPAY_SPLIT_PERCENTAGE || "50", 10);
    const splitPercentage = Math.min(Math.max(rawPercentage, 1), 99);

    console.log(`[checkout] split: client_id=${splitClientId ? splitClientId.slice(0, 8) + "..." : "UNSET"} pct=${splitPercentage}`);

    const cashIn = await createCashIn({
      amount: plan.price,
      description: `HiddenCopy - Plano ${plan.name} (${plan.credits} créditos)`,
      webhook_url: webhookUrl,
      client: {
        name: profile?.name || user.email?.split("@")[0] || "Cliente",
        cpf: cpf || profile?.cpf || undefined,
        email: user.email || "",
        phone: phone || profile?.phone || undefined,
      },
      split: splitClientId
        ? [{ user_id: splitClientId, percentage: splitPercentage }]
        : undefined,
    });

    // Salvar transação
    await serviceClient.from("transactions").insert({
      user_id: user.id,
      plan_id: plan.id,
      credits: plan.credits,
      amount: plan.price,
      status: "pending",
      syncpay_identifier: cashIn.identifier,
      pix_code: cashIn.pix_code,
    });

    // Atualizar CPF e phone no perfil se fornecidos
    if (cpf || phone) {
      const updates: Record<string, string> = {};
      if (cpf) updates.cpf = cpf;
      if (phone) updates.phone = phone;
      await serviceClient
        .from("profiles")
        .update(updates)
        .eq("id", user.id);
    }

    return NextResponse.json({
      pix_code: cashIn.pix_code,
      identifier: cashIn.identifier,
      amount: plan.price,
      plan: plan.name,
      credits: plan.credits,
    });
  } catch (err) {
    console.error("Checkout error:", err);
    const msg = err instanceof Error ? err.message : "Erro ao criar pagamento";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
