const SYNCPAY_URL = process.env.SYNCPAY_API_URL!;
const SYNCPAY_CLIENT_ID = process.env.SYNCPAY_CLIENT_ID!;
const SYNCPAY_CLIENT_SECRET = process.env.SYNCPAY_API_TOKEN!;

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAuthToken(): Promise<string> {
  // Reutiliza token se ainda válido (margem de 5 min)
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const res = await fetch(`${SYNCPAY_URL}/api/partner/v1/auth-token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      client_id: SYNCPAY_CLIENT_ID,
      client_secret: SYNCPAY_CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erro ao autenticar na SyncPay" }));
    console.error("SyncPay auth error:", error);
    throw new Error(error.message || `SyncPay auth error: ${res.status}`);
  }

  const data = await res.json();
  cachedToken = data.token || data.access_token;
  // Cache por 50 minutos (tokens geralmente duram 1h)
  tokenExpiry = Date.now() + 50 * 60 * 1000;

  if (!cachedToken) {
    console.error("SyncPay auth response:", data);
    throw new Error("Token não retornado pela SyncPay");
  }

  return cachedToken;
}

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
  const token = await getAuthToken();

  const res = await fetch(`${SYNCPAY_URL}/api/partner/v1/cash-in`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Erro na API SyncPay" }));
    console.error("SyncPay cash-in error:", error);
    throw new Error(error.message || `SyncPay error: ${res.status}`);
  }

  return res.json();
}
