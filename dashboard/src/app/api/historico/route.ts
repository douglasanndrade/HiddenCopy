import { NextRequest, NextResponse } from "next/server";
import { autenticar } from "@/lib/api-auth";
import { createServiceClient } from "@/lib/supabase-server";
import { RETENCAO_DIAS, limparHistorico } from "@/lib/historico";

export const runtime = "nodejs";

/**
 * Lista o historico. `?todos=1` traz o de todo mundo, e so pra admin.
 *
 * Sem exigir credito: quem ficou sem credito ainda tem direito de ver e baixar
 * o que ja processou.
 */
export async function GET(req: NextRequest) {
  try {
    const auth = await autenticar(req, { exigirCredito: false });
    if (!auth.ok) return auth.resposta;

    // Sem cron no container, a limpeza pega carona aqui. Nao segura a resposta.
    void limparHistorico();

    const todos = req.nextUrl.searchParams.get("todos") === "1";
    if (todos && !auth.usuario.admin) {
      return NextResponse.json({ error: "Sem permissão" }, { status: 403 });
    }

    // Modo dev nao tem usuario de verdade: sem "todos", nao ha o que listar.
    if (!todos && !auth.usuario.userId) {
      return NextResponse.json({ itens: [], retencaoDias: RETENCAO_DIAS });
    }

    const service = createServiceClient();
    const colunas = "id, arquivo, nome_original, modo, tamanho_bytes, criado_em, expira_em";

    const consulta = todos
      ? service
          .from("processamentos")
          .select(`${colunas}, profiles(email, name)`)
          .order("criado_em", { ascending: false })
          .limit(200)
      : service
          .from("processamentos")
          .select(colunas)
          .eq("user_id", auth.usuario.userId)
          .order("criado_em", { ascending: false })
          .limit(100);

    const { data, error } = await consulta;
    if (error) throw error;

    return NextResponse.json({ itens: data ?? [], retencaoDias: RETENCAO_DIAS });
  } catch (err) {
    console.error("Histórico error:", err);
    return NextResponse.json({ error: "Falha ao carregar o histórico" }, { status: 500 });
  }
}
