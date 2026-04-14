"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import {
  Users, Plus, Minus, Search, Loader2, Save,
  CreditCard, Settings, Trash2, CheckCircle,
  DollarSign, TrendingUp, Calendar, Filter,
  ArrowUpRight, ArrowDownRight, Clock
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

interface Transaction {
  id: string;
  user_id: string;
  plan_id: string;
  credits: number;
  amount: number;
  status: string;
  syncpay_identifier: string;
  pix_code: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
  user_email: string;
  user_name: string;
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

type Tab = "users" | "plans" | "vendas";
type PeriodFilter = "hoje" | "7d" | "30d" | "todos";

export default function AdminPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<Tab>("vendas");
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [adjusting, setAdjusting] = useState<string | null>(null);
  const [creditAmounts, setCreditAmounts] = useState<Record<string, number>>({});
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [plansSaved, setPlansSaved] = useState(false);
  const [newFeature, setNewFeature] = useState<Record<string, string>>({});

  // Vendas state
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [txLoading, setTxLoading] = useState(true);
  const [txSearch, setTxSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("30d");
  const [statusFilter, setStatusFilter] = useState<string>("todos");

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

  const fetchPlans = async () => {
    try {
      const res = await fetch("/api/plans");
      if (res.ok) {
        const data = await res.json();
        if (data.plans?.length) setPlans(data.plans);
      }
    } catch {}
  };

  const fetchTransactions = async () => {
    if (!session) return;
    setTxLoading(true);
    try {
      const res = await fetch("/api/admin/transactions", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTransactions(data.transactions || []);
      }
    } catch {}
    setTxLoading(false);
  };

  useEffect(() => {
    fetchUsers();
    fetchPlans();
    fetchTransactions();
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

  const [plansSaving, setPlansSaving] = useState(false);

  const savePlans = async () => {
    if (!session) return;
    setPlansSaving(true);
    try {
      const res = await fetch("/api/plans", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ plans }),
      });
      if (res.ok) {
        setPlansSaved(true);
        setTimeout(() => setPlansSaved(false), 2000);
      }
    } catch {}
    setPlansSaving(false);
  };

  const updatePlan = (idx: number, field: keyof Plan, value: string | number | boolean) => {
    const updated = [...plans];
    (updated[idx] as unknown as Record<string, unknown>)[field] = value;
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

  // ===== Filtros de vendas =====
  const now = new Date();
  const getFilterDate = (period: PeriodFilter): Date | null => {
    if (period === "hoje") {
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return null;
  };

  const filteredTx = transactions.filter((tx) => {
    const filterDate = getFilterDate(periodFilter);
    if (filterDate && new Date(tx.created_at) < filterDate) return false;
    if (statusFilter !== "todos" && tx.status !== statusFilter) return false;
    if (txSearch) {
      const q = txSearch.toLowerCase();
      return (
        tx.user_email?.toLowerCase().includes(q) ||
        tx.user_name?.toLowerCase().includes(q) ||
        tx.plan_id?.toLowerCase().includes(q) ||
        tx.syncpay_identifier?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const completedTx = filteredTx.filter((tx) => tx.status === "completed");
  const pendingTx = filteredTx.filter((tx) => tx.status === "pending" || tx.status === "WAITING_FOR_APPROVAL");
  const totalRevenue = completedTx.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const totalCredits = completedTx.reduce((sum, tx) => sum + tx.credits, 0);

  const formatCurrency = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const formatDate = (d: string) => new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });

  const statusLabel = (s: string) => {
    if (s === "completed") return "Pago";
    if (s === "pending" || s === "WAITING_FOR_APPROVAL") return "Pendente";
    if (s === "expired" || s === "cancelled") return "Expirado";
    return s;
  };

  const statusColor = (s: string) => {
    if (s === "completed") return "bg-success/15 text-success";
    if (s === "pending" || s === "WAITING_FOR_APPROVAL") return "bg-yellow-500/15 text-yellow-400";
    return "bg-red-500/15 text-red-400";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 animate-fade-in">
            <span className="text-gradient">Painel Admin</span>
          </h1>
          <p className="text-muted text-sm sm:text-base">Gerencie vendas, usuários e planos.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 sm:mb-8 flex-wrap">
        <button
          onClick={() => setTab("vendas")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
            tab === "vendas"
              ? "bg-gradient-to-r from-accent to-accent-hover text-white glow-accent"
              : "glass-card text-muted hover:text-foreground"
          }`}
        >
          <DollarSign size={18} />
          Vendas
        </button>
        <button
          onClick={() => setTab("users")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
            tab === "users"
              ? "bg-gradient-to-r from-accent to-accent-hover text-white glow-accent"
              : "glass-card text-muted hover:text-foreground"
          }`}
        >
          <Users size={18} />
          Usuários ({users.length})
        </button>
        <button
          onClick={() => setTab("plans")}
          className={`flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-medium transition-all ${
            tab === "plans"
              ? "bg-gradient-to-r from-accent to-accent-hover text-white glow-accent"
              : "glass-card text-muted hover:text-foreground"
          }`}
        >
          <Settings size={18} />
          Planos
        </button>
      </div>

      {/* ===== TAB VENDAS ===== */}
      {tab === "vendas" && (
        <div className="animate-fade-in">
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="glass-card rounded-xl p-5 animate-fade-in-up delay-1">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-success/15 flex items-center justify-center">
                  <DollarSign size={20} className="text-success" />
                </div>
                <span className="text-xs text-muted font-medium uppercase tracking-wider">Receita</span>
              </div>
              <p className="text-2xl font-bold text-success">{formatCurrency(totalRevenue)}</p>
              <p className="text-xs text-muted mt-1">{completedTx.length} vendas confirmadas</p>
            </div>

            <div className="glass-card rounded-xl p-5 animate-fade-in-up delay-2">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-accent-soft flex items-center justify-center">
                  <TrendingUp size={20} className="text-accent" />
                </div>
                <span className="text-xs text-muted font-medium uppercase tracking-wider">Créditos Vendidos</span>
              </div>
              <p className="text-2xl font-bold text-accent">{totalCredits}</p>
              <p className="text-xs text-muted mt-1">total creditado</p>
            </div>

            <div className="glass-card rounded-xl p-5 animate-fade-in-up delay-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
                  <Clock size={20} className="text-yellow-400" />
                </div>
                <span className="text-xs text-muted font-medium uppercase tracking-wider">Pendentes</span>
              </div>
              <p className="text-2xl font-bold text-yellow-400">{pendingTx.length}</p>
              <p className="text-xs text-muted mt-1">{formatCurrency(pendingTx.reduce((s, t) => s + Number(t.amount), 0))} em aberto</p>
            </div>

            <div className="glass-card rounded-xl p-5 animate-fade-in-up delay-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/15 flex items-center justify-center">
                  <CreditCard size={20} className="text-blue-400" />
                </div>
                <span className="text-xs text-muted font-medium uppercase tracking-wider">Ticket Médio</span>
              </div>
              <p className="text-2xl font-bold text-blue-400">
                {completedTx.length > 0 ? formatCurrency(totalRevenue / completedTx.length) : "R$ 0"}
              </p>
              <p className="text-xs text-muted mt-1">por venda</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por email, nome ou plano..."
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                className="w-full glass-card rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-accent/50"
              />
            </div>
            <div className="flex gap-2">
              {(["hoje", "7d", "30d", "todos"] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriodFilter(p)}
                  className={`px-4 py-3 rounded-xl text-xs font-medium transition-all ${
                    periodFilter === p
                      ? "bg-accent text-white"
                      : "glass-card text-muted hover:text-foreground"
                  }`}
                >
                  {p === "hoje" ? "Hoje" : p === "7d" ? "7 dias" : p === "30d" ? "30 dias" : "Todos"}
                </button>
              ))}
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="glass-card rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:border-accent/50 bg-transparent"
            >
              <option value="todos">Todos status</option>
              <option value="completed">Pagos</option>
              <option value="pending">Pendentes</option>
            </select>
          </div>

          {/* Tabela de transações */}
          {txLoading ? (
            <div className="flex items-center gap-2 text-muted p-8">
              <Loader2 size={20} className="animate-spin" />
              Carregando transações...
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[800px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-xs text-muted font-medium px-5 py-4 uppercase tracking-wider">Data</th>
                    <th className="text-left text-xs text-muted font-medium px-5 py-4 uppercase tracking-wider">Cliente</th>
                    <th className="text-left text-xs text-muted font-medium px-5 py-4 uppercase tracking-wider">Plano</th>
                    <th className="text-center text-xs text-muted font-medium px-5 py-4 uppercase tracking-wider">Créditos</th>
                    <th className="text-right text-xs text-muted font-medium px-5 py-4 uppercase tracking-wider">Valor</th>
                    <th className="text-center text-xs text-muted font-medium px-5 py-4 uppercase tracking-wider">Status</th>
                    <th className="text-left text-xs text-muted font-medium px-5 py-4 uppercase tracking-wider">Pagamento</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTx.map((tx) => (
                    <tr key={tx.id} className="border-b border-border/30 last:border-0 hover:bg-card-hover/50 transition-colors">
                      <td className="px-5 py-4">
                        <span className="text-sm text-foreground">{formatDate(tx.created_at)}</span>
                      </td>
                      <td className="px-5 py-4">
                        <div>
                          <p className="text-sm font-medium text-foreground">{tx.user_name || "—"}</p>
                          <p className="text-xs text-muted">{tx.user_email}</p>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium text-foreground capitalize">{tx.plan_id}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="inline-flex items-center gap-1 bg-accent-soft text-accent text-sm font-bold px-3 py-1 rounded-lg">
                          {tx.credits}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <span className="text-sm font-bold text-foreground">{formatCurrency(Number(tx.amount))}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor(tx.status)}`}>
                          {tx.status === "completed" ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                          {statusLabel(tx.status)}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs text-muted">
                          {tx.paid_at ? formatDate(tx.paid_at) : "—"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTx.length === 0 && (
                <div className="p-12 text-center text-muted text-sm">
                  Nenhuma transação encontrada.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===== TAB USUARIOS ===== */}
      {tab === "users" && (
        <div className="animate-fade-in">
          <div className="mb-6">
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Buscar por email ou nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full glass-card rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:border-accent/50"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted p-8">
              <Loader2 size={20} className="animate-spin" />
              Carregando...
            </div>
          ) : (
            <div className="glass-card rounded-2xl overflow-x-auto">
              <table className="w-full min-w-[640px]">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left text-xs text-muted font-medium px-6 py-4">Usuário</th>
                    <th className="text-left text-xs text-muted font-medium px-6 py-4">Email</th>
                    <th className="text-center text-xs text-muted font-medium px-6 py-4">Créditos</th>
                    <th className="text-left text-xs text-muted font-medium px-6 py-4">Cadastro</th>
                    <th className="text-center text-xs text-muted font-medium px-6 py-4">Gerenciar Créditos</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((u) => (
                    <tr key={u.id} className="border-b border-border/30 last:border-0 hover:bg-card-hover/50 transition-colors">
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
        </div>
      )}

      {/* ===== TAB PLANOS ===== */}
      {tab === "plans" && (
        <div className="animate-fade-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
            <p className="text-sm text-muted">
              Edite os planos abaixo. As mudanças são salvas no servidor e afetam todos os usuários.
            </p>
            <button
              onClick={savePlans}
              disabled={plansSaving}
              className="flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl text-sm font-medium btn-glow transition-all disabled:opacity-50"
            >
              {plansSaved ? (
                <>
                  <CheckCircle size={16} />
                  Salvo!
                </>
              ) : plansSaving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Salvar Planos
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {plans.map((plan, idx) => (
              <div
                key={plan.id}
                className={`glass-card rounded-2xl p-6 ${
                  plan.popular ? "border-accent" : ""
                }`}
              >
                <div className="space-y-4">
                  <div>
                    <label className="text-xs text-muted block mb-1">Nome do Plano</label>
                    <input
                      type="text"
                      value={plan.name}
                      onChange={(e) => updatePlan(idx, "name", e.target.value)}
                      className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-accent"
                    />
                  </div>

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

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={plan.popular}
                      onChange={(e) => updatePlan(idx, "popular", e.target.checked)}
                      className="accent-accent w-4 h-4"
                    />
                    <span className="text-sm">Marcar como popular</span>
                  </label>

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
        </div>
      )}
    </div>
  );
}
