import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const event = req.headers.get("event");
    const auth = req.headers.get("authorization");

    // Validar token do webhook
    const expectedToken = process.env.SYNCPAY_WEBHOOK_TOKEN;
    if (expectedToken && auth !== `Bearer ${expectedToken}`) {
      console.warn("Webhook: token inválido");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = body.data;

    if (!data?.id || !data?.status) {
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    console.log(`Webhook SyncPay [${event}]: ${data.id} -> ${data.status}`);

    const supabase = createServiceClient();

    // Buscar transação pelo identifier do SyncPay
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("syncpay_identifier", data.id)
      .single();

    if (txError || !transaction) {
      console.warn(`Webhook: transação não encontrada para ${data.id}`);
      return NextResponse.json({ ok: true });
    }

    // Se já foi processada, ignora
    if (transaction.status === "completed") {
      return NextResponse.json({ ok: true });
    }

    // Atualizar status da transação
    await supabase
      .from("transactions")
      .update({
        status: data.status,
        paid_at: data.status === "completed" ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", transaction.id);

    // Se pagamento confirmado, adicionar créditos
    if (data.status === "completed") {
      const { data: profile } = await supabase
        .from("profiles")
        .select("credits")
        .eq("id", transaction.user_id)
        .single();

      const currentCredits = profile?.credits || 0;
      const newCredits = currentCredits + transaction.credits;

      await supabase
        .from("profiles")
        .update({
          credits: newCredits,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.user_id);

      console.log(
        `Créditos adicionados: user=${transaction.user_id}, +${transaction.credits} (total: ${newCredits})`
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
