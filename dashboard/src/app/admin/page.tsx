"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Users, Plus, Minus, Search, Loader2 } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  credits: number;
  created_at: string;
}

export default function AdminPage() {
  const { session } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [creditAmount, setCreditAmount] = useState(0);

  const fetchUsers = async () => {
    if (!session) return;
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [session]);

  const adjustCredits = async (userId: string, action: "add" | "set") => {
    if (!session) return;
    setAdjusting(userId);
    try {
      await fetch("/api/admin/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          userId,
          credits: creditAmount,
          action,
        }),
      });
      await fetchUsers();
      setCreditAmount(0);
    } catch {}
    setAdjusting(null);
  };

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center gap-2 text-muted">
        <Loader2 size={20} className="animate-spin" />
        Carregando...
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Painel Admin</h1>
          <p className="text-muted">Gerencie usuários e créditos.</p>
        </div>
        <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-4 py-2">
          <Users size={18} className="text-muted" />
          <span className="text-sm font-medium">{users.length} usuários</span>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            placeholder="Buscar por email ou nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-lg pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-accent"
          />
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left text-xs text-muted font-medium px-6 py-3">Usuário</th>
              <th className="text-left text-xs text-muted font-medium px-6 py-3">Email</th>
              <th className="text-center text-xs text-muted font-medium px-6 py-3">Créditos</th>
              <th className="text-left text-xs text-muted font-medium px-6 py-3">Cadastro</th>
              <th className="text-center text-xs text-muted font-medium px-6 py-3">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-border last:border-0 hover:bg-card-hover">
                <td className="px-6 py-4 text-sm">{u.name || "--"}</td>
                <td className="px-6 py-4 text-sm text-muted">{u.email}</td>
                <td className="px-6 py-4 text-center">
                  <span className="text-sm font-bold text-accent">{u.credits}</span>
                </td>
                <td className="px-6 py-4 text-sm text-muted">
                  {new Date(u.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center justify-center gap-2">
                    <input
                      type="number"
                      placeholder="Qtd"
                      className="w-16 bg-background border border-border rounded px-2 py-1 text-sm text-center focus:outline-none focus:border-accent"
                      onChange={(e) => setCreditAmount(Number(e.target.value))}
                    />
                    <button
                      onClick={() => adjustCredits(u.id, "add")}
                      disabled={adjusting === u.id}
                      className="p-1.5 bg-success/20 text-success rounded hover:bg-success/30 transition-all disabled:opacity-50"
                      title="Adicionar créditos"
                    >
                      {adjusting === u.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Plus size={14} />
                      )}
                    </button>
                    <button
                      onClick={() => adjustCredits(u.id, "set")}
                      disabled={adjusting === u.id}
                      className="p-1.5 bg-accent-soft text-accent rounded hover:bg-accent/25 transition-all disabled:opacity-50"
                      title="Definir créditos"
                    >
                      <Minus size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="p-8 text-center text-muted text-sm">
            Nenhum usuário encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
