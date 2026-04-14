const SYNCPAY_URL = process.env.SYNCPAY_API_URL!;
const SYNCPAY_TOKEN = process.env.SYNCPAY_API_TOKEN!;

export interface CashInRequest {
  amount: number;
  description: string;
  webhook_url: string;
  client: {
    name: string;
    cpf: string;
    email: string;
    phone: string;
  };
}

export interface CashInResponse {
  message: string;
  pix_code: string;
  identifier: string;
}

export async function createCashIn(data: CashInRequest): Promise<CashInResponse> {
  const res = await fetch(`${SYNCPAY_URL}/api/partner/v1/cash-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${SYNCPAY_TOKEN}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erro na API SyncPay" }));
    throw new Error(error.message || `SyncPay error: ${res.status}`);
  }

  return res.json();
}
