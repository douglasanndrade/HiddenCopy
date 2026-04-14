"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import {
  Users, Plus, Minus, Search, Loader2, Save,
  CreditCard, Settings, Trash2, CheckCircle
} from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name: string;
  credits: number;
  created_at: string;
}

interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number;
  features: string[];
  popular: boolean;
  icon: string;
}

const defaultPlans: Plan[] = [
  {
    id: "teste", name: "Teste", credits: 5, price: 79.9,
    features: ["5 processamentos", "Melhorar áudio", "Mesclar com música", "Download em MP4"],
    popular: false, icon: "zap",
  },
  {
    id: "basico", name: "Básico", credits: 10, price: 139.9,
    features: ["10 processamentos", "Melhorar áudio", "Mesclar com música", "Download em MP4", "Prioridade no processamento"],
    popular: true, icon: "star",
  },
  {
    id: "pro", name: "Pro", credits: 50, price: 349.9,
    features: ["50 processamentos", "Melhorar áudio", "Mesclar com música", "Download em MP4", "Prioridade no processamento", "Suporte prioritário"],
    popular: false, icon: "crown",
  },
];

type Tab = "users" | "plans";

export default function AdminPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("users");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [creditAmounts, setCreditAmounts] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [plansSaved, setPlansSaved] = useState(false);
  const [newFeature, setNewFeature] = useState<Record<string, string>>({});

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
    const saved = localStorage.getItem("hiddencopy_plans");
    if (saved) {
      try { setPlans(JSON.parse(saved)); } catch {}
    }
  }, [session]);

  const adjustCredits = async (userId: string, action: "add" | "set") => {
    if (!session) return;
    const amount = creditAmounts[userId] || 0;
    if (amount === 0) return;
    setAdjusting(userId);
    try {
      await fetch("/api/admin/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ userId, credits: amount, action }),
      });
      await fetchUsers();
    } catch {}
    setAdjusting(null);
  };

  const savePlans = () => {
    localStorage.setItem("hiddencopy_plans", JSON.stringify(plans));
    setPlansSaved(true);
    setTimeout(() => setPlansSaved(false), 2000);
  };

  const updatePlan = (idx: number, field: keyof Plan, value: string | number | boolean) => {
    const updated = [...plans];
    (updated[idx] as Record<string, unknown>)[field] = value;
    setPlans(updated);
  };

  const addFeature = (idx: number) => {
    const feat = newFeature[plans[idx].id]?.trim();
    if (!feat) return;
    const updated = [...plans];
    updated[idx].features.push(feat);
    setPlans(updated);
    setNewFeature({ ...newFeature, [plans[idx].id]: "" });
  };

  const removeFeature = (planIdx: number, featIdx: number) => {
    const updated = [...plans];
    updated[planIdx].features.splice(featIdx, 1);
    setPlans(updated);
  };

  const filtered = users.filter(
    (u) =>
      u.email?.toLowerCase().includes(search.toLowerCase()) ||
      u.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Painel Admin</h1>
          <p className="text-muted">Gerencie usuários, créditos e planos.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-8">
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
            tab === "users"
              ? "bg-accent text-white"
              : "bg-card border border-border text-muted hover:text-foreground"
          }`}
        >
          <Users size={18} />
          Usuários ({users.length})
        </button>
        <button
          onClick={() => setTab("plans")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
            tab === "plans"
              ? "bg-accent text-white"
              : "bg-card border border-border text-muted hover:text-foreground"
          }`}
        >
          <Settings size={18} />
          Planos
        </button>
      </div>

      {/* Tab Usuários */}
      {tab === "users" && (
        <>
          <div className="mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por email ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-card border border-border rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted p-8">
              <Loader2 size={20} className="animate-spin" />
              Carregando...
            </div>
          ) : (
            <div className="bg-card border border-border rounded-2xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-card-hover">
                    <th className="text-left text-xs text-muted font-medium px-6 py-4">Usuário</th>
                    <th className="text-left text-xs text-muted font-medium px-6 py-4">Email</th>
                    <th className="text-center text-xs text-muted font-medium px-6 py-4">Créditos</th>
                    <th className="text-left text-xs text-muted font-medium px-6 py-4">Cadastro</th>
                    <th className="text-center text-xs text-muted font-medium px-6 py-4">Gerenciar Créditos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-border last:border-0 hover:bg-card-hover transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium">{u.name || "--"}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">{u.email}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-accent-soft text-accent text-sm font-bold px-3 py-1 rounded-lg">
                          <CreditCard size={14} />
                          {u.credits}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-muted">
                        {new Date(u.created_at).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            placeholder="Qtd"
                            value={creditAmounts[u.id] || ""}
                            className="w-20 bg-background border border-border rounded-lg px-3 py-2 text-sm text-center focus:outline-none focus:border-accent"
                            onChange={(e) =>
                              setCreditAmounts({ ...creditAmounts, [u.id]: Number(e.target.value) })
                            }
                          />
                          <button
                            onClick={() => adjustCredits(u.id, "add")}
                            disabled={adjusting === u.id}
                            className="px-3 py-2 bg-success/15 text-success rounded-lg hover:bg-success/25 transition-all disabled:opacity-50 text-xs font-medium flex items-center gap-1"
                            title="Adicionar créditos"
                          >
                            {adjusting === u.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : (
                              <Plus size={14} />
                            )}
                            Add
                          </button>
                          <button
                            onClick={() => adjustCredits(u.id, "set")}
                            disabled={adjusting === u.id}
                            className="px-3 py-2 bg-accent-soft text-accent rounded-lg hover:bg-accent/25 transition-all disabled:opacity-50 text-xs font-medium flex items-center gap-1"
                            title="Definir créditos"
                          >
                            <Minus size={14} />
                            Set
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filtered.length === 0 && (
                <div className="p-12 text-center text-muted text-sm">
                  Nenhum usuário encontrado.
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Tab Planos */}
      {tab === "plans" && (
        <>
          <div className="flex items-center justify-between mb-6">
            <p className="text-sm text-muted">
              Edite os planos abaixo. As mudanças ficam salvas no navegador e afetam a página de créditos.
            </p>
            <button
              onClick={savePlans}
              className="flex items-center gap-2 px-5 py-3 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover transition-all"
            >
              {plansSaved ? (
                <>
                  <CheckCircle size={16} />
                  Salvo!
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar Planos
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {plans.map((plan, idx) => (
              <div
                key={plan.id}
                className={`bg-card border rounded-2xl p-6 ${
                  plan.popular ? "border-accent" : "border-border"
                }`}
              >
                <div className="space-y-4">
                  {/* Nome */}
                  <div>
                    <label className="text-xs text-muted block mb-1">Nome do Plano</label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => updatePlan(idx, "name", e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-accent"
                    />
                  </div>

                  {/* Preço e Créditos */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-muted block mb-1">Preço (R$)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={plan.price}
                        onChange={(e) => updatePlan(idx, "price", Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted block mb-1">Créditos</label>
                      <input
                        type="number"
                        value={plan.credits}
                        onChange={(e) => updatePlan(idx, "credits", Number(e.target.value))}
                        className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>

                  {/* Ícone */}
                  <div>
                    <label className="text-xs text-muted block mb-1">Ícone</label>
                    <select
                      value={plan.icon}
                      onChange={(e) => updatePlan(idx, "icon", e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                    >
                      <option value="zap">Zap (raio)</option>
                      <option value="star">Star (estrela)</option>
                      <option value="crown">Crown (coroa)</option>
                    </select>
                  </div>

                  {/* Popular */}
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.popular}
                      onChange={(e) => updatePlan(idx, "popular", e.target.checked)}
                      className="accent-accent w-4 h-4"
                    />
                    <span className="text-sm">Marcar como popular</span>
                  </label>

                  {/* Features */}
                  <div>
                    <label className="text-xs text-muted block mb-2">Recursos</label>
                    <div className="space-y-2">
                      {plan.features.map((feat, fIdx) => (
                        <div key={fIdx} className="flex items-center gap-2">
                          <span className="flex-1 text-sm bg-background border border-border rounded-lg px-3 py-2">
                            {feat}
                          </span>
                          <button
                            onClick={() => removeFeature(idx, fIdx)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Novo recurso..."
                          value={newFeature[plan.id] || ""}
                          onChange={(e) =>
                            setNewFeature({ ...newFeature, [plan.id]: e.target.value })
                          }
                          onKeyDown={(e) => e.key === "Enter" && addFeature(idx)}
                          className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent"
                        />
                        <button
                          onClick={() => addFeature(idx)}
                          className="px-3 py-2 bg-accent-soft text-accent rounded-lg hover:bg-accent/25 transition-colors"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
