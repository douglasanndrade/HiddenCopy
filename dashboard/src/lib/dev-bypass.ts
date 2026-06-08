// Dev-only auth bypass. Enable by setting NEXT_PUBLIC_DEV_BYPASS_AUTH=true in .env.local.
// Skips Supabase entirely so the dashboard can run offline with a fake user.

export const isDevBypass =
  process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true";

export const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001";

export const MOCK_USER = {
  id: MOCK_USER_ID,
  aud: "authenticated",
  role: "authenticated",
  email: "dev@local",
  email_confirmed_at: new Date(0).toISOString(),
  phone: "",
  confirmed_at: new Date(0).toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { name: "Dev Local" },
  identities: [],
  created_at: new Date(0).toISOString(),
  updated_at: new Date().toISOString(),
};

export const MOCK_SESSION = {
  access_token: "dev-bypass-token",
  refresh_token: "dev-bypass-refresh",
  token_type: "bearer",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: MOCK_USER,
};

export const MOCK_PLANS = [
  {
    id: "teste",
    name: "Teste",
    credits: 5,
    price: 79.9,
    features: [
      "5 processamentos",
      "Camuflar vídeo",
      "Camuflar vídeo + áudio",
      "Download em MP4",
    ],
    popular: false,
    icon: "zap",
  },
  {
    id: "basico",
    name: "Básico",
    credits: 10,
    price: 139.9,
    features: [
      "10 processamentos",
      "Camuflar vídeo",
      "Camuflar vídeo + áudio",
      "Download em MP4",
      "Prioridade no processamento",
    ],
    popular: true,
    icon: "star",
  },
  {
    id: "pro",
    name: "Pro",
    credits: 50,
    price: 349.9,
    features: [
      "50 processamentos",
      "Camuflar vídeo",
      "Camuflar vídeo + áudio",
      "Download em MP4",
      "Prioridade no processamento",
      "Suporte prioritário",
    ],
    popular: false,
    icon: "crown",
  },
];

export const MOCK_STATS = { melhorados: 3, mesclados: 2 };
export const MOCK_CREDITS = 999;
