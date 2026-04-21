const SYNCPAY_URL = (process.env.SYNCPAY_API_URL || "https://api.syncpayments.com.br").trim();
const SYNCPAY_CLIENT_ID = (process.env.SYNCPAY_CLIENT_ID || "").trim();
const SYNCPAY_CLIENT_SECRET = (process.env.SYNCPAY_API_TOKEN || "").trim();

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getAuthToken(): Promise<string> {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const authUrl = `${SYNCPAY_URL}/api/partner/v1/auth-token`;
  console.log("[syncpay] AUTH:", authUrl, "CLIENT_ID:", SYNCPAY_CLIENT_ID.slice(0, 4) + "***");

  const res = await fetch(authUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ client_id: SYNCPAY_CLIENT_ID, client_secret: SYNCPAY_CLIENT_SECRET }),
  });

  const text = await res.text();
  console.log("[syncpay] AUTH STATUS:", res.status);

  if (!res.ok) {
    cachedToken = null;
    throw new Error(`SyncPay auth ${res.status}: ${text.slice(0, 200)}`);
  }

  const data = JSON.parse(text) as { access_token?: string; token?: string; expires_in?: number };
  cachedToken = data.access_token || data.token || null;
  tokenExpiry = Date.now() + (data.expires_in ? (data.expires_in - 300) * 1000 : 55 * 60 * 1000);

  if (!cachedToken) {
    throw new Error("Token não retornado pela SyncPay");
  }

  return cachedToken;
}

export interface CashInSplit {
  user_id: string;
  percentage: number;
}

export interface CashInRequest {
  amount: number;
  description: string;
  webhook_url: string;
  client: {
    name: string;
    cpf?: string;
    email: string;
    phone?: string;
  };
  split?: CashInSplit[];
  external_reference?: string;
}

export interface CashInResponse {
  message: string;
  pix_code: string;
  identifier: string;
  external_reference?: string;
}

export async function createCashIn(data: CashInRequest): Promise<CashInResponse> {
  const token = await getAuthToken();

  const externalReference = data.external_reference ?? crypto.randomUUID().replace(/-/g, "");

  const client: Record<string, string> = {
    name: data.client.name,
    email: data.client.email,
  };
  if (data.client.phone && data.client.phone !== "00000000000") {
    client.phone = data.client.phone;
  }
  if (data.client.cpf && data.client.cpf !== "00000000000") {
    client.cpf = data.client.cpf;
  }

  const payload: Record<string, unknown> = {
    amount: data.amount,
    description: data.description,
    webhook_url: data.webhook_url,
    client,
    external_reference: externalReference,
  };
  if (data.split && data.split.length > 0) {
    payload.split = data.split;
  }

  console.log("[syncpay] cash-in payload:", JSON.stringify({
    ...payload,
    client: { ...client, cpf: client.cpf ? "***" : undefined, email: "***", phone: client.phone ? "***" : undefined },
  }));

  const pixUrl = `${SYNCPAY_URL}/api/partner/v1/cash-in`;

  let res = await fetch(pixUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload),
  });
  let text = await res.text();
  console.log(`[syncpay] cash-in status=${res.status}:`, text.slice(0, 400));

  if (!res.ok && payload.split) {
    console.warn("[syncpay] split falhou, tentando sem split...");
    const retryBody = { ...payload };
    delete retryBody.split;
    res = await fetch(pixUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(retryBody),
    });
    text = await res.text();
    console.log(`[syncpay] retry status=${res.status}:`, text.slice(0, 400));
  }

  if (!res.ok) {
    throw new Error(`SyncPay cash-in ${res.status}: ${text.slice(0, 200)}`);
  }

  const body = JSON.parse(text) as Record<string, unknown>;
  return {
    message: (body.message as string) ?? "",
    pix_code: (body.pix_code as string) ?? "",
    identifier: (body.identifier as string) ?? (body.id as string) ?? externalReference,
    external_reference: externalReference,
  };
}
