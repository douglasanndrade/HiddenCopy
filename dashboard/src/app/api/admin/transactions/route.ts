import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";

async function verifyAdmin(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;

  const token = authHeader.replace("Bearer ", "");
  const supabase = createServerClient(token);

  try {
    const { data, error: authError } = await supabase.auth.getUser();
    if (authError || !data.user) return null;
    if (!isAdminEmail(data.user.email)) return null;
    return data.user;
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = createServiceClient();

  const { data: transactions, error } = await supabase
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!transactions?.length) {
    return NextResponse.json({ transactions: [] });
  }

  // Buscar profiles para associar emails
  const userIds = [...new Set(transactions.map((t) => t.user_id))];

  let profileMap = new Map();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, email, name")
      .in("id", userIds);

    profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
  }

  const enriched = transactions.map((t) => ({
    ...t,
    user_email: profileMap.get(t.user_id)?.email || "—",
    user_name: profileMap.get(t.user_id)?.name || "—",
  }));

  return NextResponse.json({ transactions: enriched });
}
