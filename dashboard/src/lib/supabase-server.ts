import { createClient } from "@supabase/supabase-js";

// Client com service role para operações do servidor (webhooks, admin)
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// Client público para API routes que precisam do usuário autenticado
export function createServerClient(authToken?: string) {
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    authToken
      ? { global: { headers: { Authorization: `Bearer ${authToken}` } } }
      : undefined
  );
  return client;
}
