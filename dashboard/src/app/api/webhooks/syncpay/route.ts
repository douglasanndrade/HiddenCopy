import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase-server";

// Status que indicam pagamento confirmado
const PAID_STATUSES = [
  "completed",
  "approved",
  "paid",
  "settled",
  "confirmed",
  "COMPLETED",
  "APPROVED",
  "PAID",
  "SETTLED",
  "CONFIRMED",
];

function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.includes(status) ||
    status.toLowerCase().includes("paid") ||
    status.toLowerCase().includes("approved") ||
    status.toLowerCase().includes("completed") ||
    status.toLowerCase().includes("settled");
}

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
    const data = body.data || body;

    // Log completo do payload para debug
    console.log(`Webhook SyncPay recebido:`, JSON.stringify({ event, data: body }, null, 2));

    const identifier = data?.id || data?.identifier || body?.id || body?.identifier;
    const status = data?.status || body?.status;

    if (!identifier) {
      console.warn("Webhook: payload sem identifier", JSON.stringify(body));
      return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    console.log(`Webhook SyncPay [${event}]: ${identifier} -> ${status}`);

    const supabase = createServiceClient();

    // Buscar transação pelo identifier do SyncPay
    const { data: transaction, error: txError } = await supabase
      .from("transactions")
      .select("*")
      .eq("syncpay_identifier", identifier)
      .single();

    if (txError || !transaction) {
      console.warn(`Webhook: transação não encontrada para identifier=${identifier}`);
      return NextResponse.json({ ok: true });
    }

    console.log(`Webhook: transação encontrada id=${transaction.id}, status_atual=${transaction.status}, novo_status=${status}`);

    // Se já foi completada, ignora
    if (transaction.status === "completed") {
      console.log("Webhook: transação já completada, ignorando");
      return NextResponse.json({ ok: true });
    }

    // Se pagamento confirmado, adicionar créditos
    if (status && isPaidStatus(status)) {
      // Atualizar transação como completed
      const { error: updateError } = await supabase
        .from("transactions")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      if (updateError) {
        console.error(`ERRO ao atualizar status da transação ${transaction.id}:`, updateError);
      } else {
        console.log(`Transação ${transaction.id} atualizada para completed`);
      }

      // Adicionar créditos
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
        `CREDITOS ADICIONADOS: user=${transaction.user_id}, +${transaction.credits} (${currentCredits} -> ${newCredits})`
      );
    } else {
      // Atualizar status da transação sem creditar
      await supabase
        .from("transactions")
        .update({
          status: status || transaction.status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", transaction.id);

      console.log(`Webhook: status atualizado para ${status} (sem creditar)`);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ ok: true });
  }
}
