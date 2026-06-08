import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";
import { isAdminEmail } from "@/lib/admin";
import { isDevBypass, MOCK_USER_ID } from "@/lib/dev-bypass";

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

// GET - listar todos os usuários
export async function GET(req: NextRequest) {
  if (isDevBypass) {
    return NextResponse.json({
      users: [
        {
          id: MOCK_USER_ID,
          email: "dev@local",
          name: "Dev Local",
          credits: 999,
          created_at: new Date().toISOString(),
        },
      ],
    });
  }
  const admin = await verifyAdmin(req);
  if (!admin) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  const supabase = createServiceClient();
  const { data: users, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ users });
}
