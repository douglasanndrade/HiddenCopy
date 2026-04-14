"use client";

import { Check, Zap, Star, Crown, Loader2, Copy, CheckCircle, X, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { QRCode } from "react-qrcode-logo";

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
    id: "teste",
    name: "Teste",
    credits: 5,
    price: 79.9,
    features: [
      "5 processamentos",
      "Melhorar áudio",
      "Mesclar com música",
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
      "Melhorar áudio",
      "Mesclar com música",
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
      "Melhorar áudio",
      "Mesclar com música",
      "Download em MP4",
      "Prioridade no processamento",
      "Suporte prioritário",
    ],
    popular: false,
    icon: "crown",
  },
];

const iconMap: Record<string, React.ReactNode> = {
  zap: <Zap size={28} />,
  star: <Star size={28} />,
  crown: <Crown size={28} />,
};

const tierGradients: Record<string, string> = {
  zap: "from-blue-500 to-cyan-400",
  star: "from-accent to-yellow-400",
  crown: "from-purple-500 to-pink-500",
};

const errosMap: Record<string, string> = {
  "Failed to fetch": "Erro de conexão. Verifique sua internet",
  "fetch failed": "Erro de conexão. Verifique sua internet",
  "Network request failed": "Erro de conexão. Verifique sua internet",
  "Não autenticado": "Sessão expirada. Faça login novamente",
  "Plano inválido": "Plano não encontrado. Recarregue a página",
  "Load failed": "Erro de conexão. Verifique sua internet",
};

function traduzirErro(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  for (const [en, pt] of Object.entries(errosMap)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return pt;
  }
  return msg;
}

export default function Creditos() {
  const { credits, session, refreshCredits } = useAuth();
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [buying, setBuying] = useState(false);
  const [showPixModal, setShowPixModal] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingPlan, setPendingPlan] = useState<Plan | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/plans");
        if (res.ok) {
          const data = await res.json();
          if (data.plans?.length) setPlans(data.plans);
        }
      } catch {}
    };
    fetchPlans();
  }, []);

  const handleBuy = (plan: Plan) => {
    setPendingPlan(plan);
    setShowForm(true);
    setError(null);
  };

  const confirmBuy = async () => {
    if (!session || !pendingPlan) return;
    if (!cpf || cpf.length !== 11) {
      setError("CPF deve ter 11 dígitos (apenas números)");
      return;
    }
    if (!phone || phone.length < 10) {
      setError("Telefone deve ter 10 ou 11 dígitos");
      return;
    }

    setBuying(true);
    setError(null);
    setShowForm(false);

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId: pendingPlan.id, cpf, phone }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao gerar pagamento");
      }

      const data = await res.json();
      setPixCode(data.pix_code);
      setSelectedPlan(pendingPlan);
      setShowPixModal(true);

      const interval = setInterval(async () => {
        await refreshCredits();
      }, 5000);
      setTimeout(() => clearInterval(interval), 15 * 60 * 1000);
    } catch (err) {
      setError(traduzirErro(err));
    } finally {
      setBuying(false);
    }
  };

  const copyPixCode = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 lg:mb-10 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 text-gradient">Créditos</h1>
        <p className="text-muted text-sm sm:text-base">
          Escolha o plano ideal para seus criativos.
        </p>
      </div>

      {/* Balance Card */}
      <div className="glass-card relative overflow-hidden rounded-2xl p-6 sm:p-8 mb-8 lg:mb-12 animate-fade-in-up">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-accent/8 to-transparent pointer-events-none" />
        <div className="noise" />
        <div className="relative flex items-center gap-4 sm:gap-6">
          <div className="w-14 h-14 sm:w-18 sm:h-18 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0 glow-accent">
            <Sparkles size={28} className="text-accent animate-float sm:hidden" />
            <Sparkles size={36} className="text-accent animate-float hidden sm:block" />
          </div>
          <div>
            <p className="text-xs sm:text-sm text-muted mb-1 uppercase tracking-wider font-medium">
              Seu saldo atual
            </p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl sm:text-5xl font-bold text-gradient">{credits}</span>
              <span className="text-base sm:text-lg text-muted font-medium">créditos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-8 mb-10">
        {plans.map((plan, index) => (
          <div
            key={plan.id}
            className={`
              glass-card relative rounded-2xl flex flex-col overflow-hidden
              transition-all duration-300 hover:scale-[1.02]
              animate-fade-in-up delay-${index + 1}
              ${
                plan.popular
                  ? "border-2 border-accent glow-accent"
                  : "border border-border/50 hover:border-accent/50"
              }
            `}
          >
            {/* Popular badge */}
            {plan.popular && (
              <div className="relative overflow-hidden">
                <div className="bg-gradient-to-r from-accent to-yellow-500 animate-gradient text-white text-xs font-bold text-center py-2.5 tracking-widest uppercase">
                  Mais Popular
                </div>
              </div>
            )}

            <div className="p-5 sm:p-8 flex flex-col flex-1">
              {/* Icon + Name */}
              <div className="flex items-center gap-4 mb-5 sm:mb-6">
                <div
                  className={`
                    w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center
                    bg-gradient-to-br ${tierGradients[plan.icon] || "from-accent to-accent"}
                    text-white animate-scale-in shadow-lg
                  `}
                >
                  {iconMap[plan.icon] || <Zap size={28} />}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-bold text-foreground">{plan.name}</h3>
                  <p className="text-sm text-muted">{plan.credits} criativos</p>
                </div>
              </div>

              {/* Price */}
              <div className="mb-6 sm:mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted font-medium">R$</span>
                  <span className="text-3xl sm:text-4xl font-bold text-foreground">
                    {formatPrice(plan.price)}
                  </span>
                </div>
                <p className="text-xs text-muted mt-1.5">
                  R$ {(plan.price / plan.credits).toFixed(2)} por criativo
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-3.5 mb-8 flex-1">
                {plan.features.map((feature, fIndex) => (
                  <li
                    key={feature}
                    className={`flex items-start gap-3 animate-fade-in-up delay-${Math.min(fIndex + 1, 5)}`}
                  >
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} className="text-success" />
                    </div>
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Buy Button */}
              <button
                onClick={() => handleBuy(plan)}
                disabled={buying}
                className={`
                  w-full py-4 rounded-xl font-semibold text-sm transition-all duration-300
                  flex items-center justify-center gap-2 disabled:opacity-50
                  ${
                    plan.popular
                      ? "bg-gradient-to-r from-accent to-accent-hover text-white btn-glow glow-accent shadow-lg shadow-accent/25 hover:shadow-accent/40"
                      : "glass border border-border/50 text-foreground hover:border-accent hover:text-accent"
                  }
                `}
              >
                {buying ? <Loader2 size={18} className="animate-spin" /> : null}
                Adquirir Agora
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Error toast */}
      {error && !showForm && (
        <div className="max-w-md mx-auto glass-card border border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-6 animate-fade-in-up">
          <X size={20} className="text-red-500 shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* CPF/Phone Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
          <div className="glass-card animate-scale-in border border-border/50 rounded-2xl p-6 sm:p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-foreground">Finalizar Compra</h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setError(null);
                }}
                className="p-2 hover:bg-card-hover rounded-lg transition-colors"
              >
                <X size={20} className="text-muted" />
              </button>
            </div>

            {/* Plan summary pill */}
            {pendingPlan && (
              <div className="bg-gradient-to-r from-accent/15 to-accent/5 border border-accent/20 rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold text-foreground">{pendingPlan.name}</p>
                  <p className="text-xs text-muted">{pendingPlan.credits} créditos</p>
                </div>
                <p className="text-xl font-bold text-gradient">{`R$ ${formatPrice(pendingPlan.price)}`}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2 text-foreground">CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="Apenas números (11 dígitos)"
                  className="w-full bg-background/50 border border-glass-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.15)] transition-all"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2 text-foreground">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="DDD + número (ex: 51999999999)"
                  className="w-full bg-background/50 border border-glass-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent focus:shadow-[0_0_0_3px_rgba(var(--accent-rgb),0.15)] transition-all"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={confirmBuy}
                disabled={buying}
                className="w-full py-4 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl font-semibold text-sm btn-glow hover:shadow-accent/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {buying && <Loader2 size={18} className="animate-spin" />}
                Gerar QR Code Pix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PIX QR Code Modal */}
      {showPixModal && pixCode && selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center modal-overlay">
          <div className="glass-card animate-scale-in border border-border/50 rounded-2xl max-w-lg w-full mx-4 shadow-2xl overflow-hidden">
            {/* Gradient accent stripe header */}
            <div className="relative">
              <div className="h-1.5 bg-gradient-to-r from-accent via-yellow-400 to-accent animate-gradient" />
              <div className="p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-foreground">Pagamento Pix</h3>
                  <p className="text-sm text-muted">
                    Plano {selectedPlan.name} — {selectedPlan.credits} créditos
                  </p>
                </div>
                <button
                  onClick={() => setShowPixModal(false)}
                  className="p-2 hover:bg-card-hover rounded-lg transition-colors"
                >
                  <X size={20} className="text-muted" />
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-8 pt-0 sm:pt-0">
              {/* Amount */}
              <div className="text-center mb-5 sm:mb-6">
                <p className="text-sm text-muted mb-1">Valor a pagar</p>
                <p className="text-3xl sm:text-4xl font-bold text-gradient">
                  R$ {formatPrice(selectedPlan.price)}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-5 sm:mb-6">
                <div className="bg-white p-4 sm:p-5 rounded-2xl shadow-lg shadow-black/20">
                  <QRCode
                    value={pixCode}
                    size={200}
                    qrStyle="dots"
                    eyeRadius={8}
                    fgColor="#121212"
                  />
                </div>
              </div>

              {/* Copy button */}
              <button
                onClick={copyPixCode}
                className="w-full glass border border-border/50 flex items-center justify-center gap-3 py-4 rounded-xl text-sm font-medium hover:border-accent hover:shadow-[0_0_15px_rgba(var(--accent-rgb),0.1)] transition-all mb-4"
              >
                {copied ? (
                  <>
                    <CheckCircle size={18} className="text-success" />
                    <span className="text-success">Código copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} className="text-muted" />
                    <span className="text-foreground">Copiar código Pix (copia e cola)</span>
                  </>
                )}
              </button>

              {/* Info pill */}
              <div className="bg-accent-soft rounded-xl p-4 flex items-start gap-3">
                <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0 animate-pulse-glow" />
                <p className="text-xs text-muted leading-relaxed">
                  Escaneie o QR Code ou copie o código acima e cole no app do seu banco.
                  Seus <strong className="text-foreground">{selectedPlan.credits} créditos</strong> serão
                  adicionados automaticamente após a confirmação do pagamento.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
