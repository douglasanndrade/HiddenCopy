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
    // Carregar planos do localStorage (admin pode ter editado)
    const saved = localStorage.getItem("hiddencopy_plans");
    if (saved) {
      try {
        setPlans(JSON.parse(saved));
      } catch {}
    }
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
      setError(err instanceof Error ? err.message : "Erro ao gerar pagamento");
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
    <div className="p-8">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold mb-2">Créditos</h1>
        <p className="text-muted">Escolha o plano ideal para seus criativos.</p>
      </div>

      {/* Saldo atual */}
      <div className="bg-gradient-to-r from-accent/10 via-accent/5 to-transparent border border-accent/20 rounded-2xl p-8 mb-12">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center">
            <Sparkles size={32} className="text-accent" />
          </div>
          <div>
            <p className="text-sm text-muted mb-1">Seu saldo atual</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-accent">{credits}</span>
              <span className="text-lg text-muted">créditos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-10">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className={`relative bg-card rounded-2xl flex flex-col overflow-hidden transition-all hover:scale-[1.02] ${
              plan.popular
                ? "border-2 border-accent shadow-xl shadow-accent/10"
                : "border border-border hover:border-muted"
            }`}
          >
            {plan.popular && (
              <div className="bg-accent text-white text-xs font-bold text-center py-2 tracking-wider uppercase">
                Mais Popular
              </div>
            )}

            <div className="p-8 flex flex-col flex-1">
              {/* Ícone e nome */}
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center ${
                  plan.popular ? "bg-accent text-white" : "bg-accent-soft text-accent"
                }`}>
                  {iconMap[plan.icon] || <Zap size={28} />}
                </div>
                <div>
                  <h3 className="text-xl font-bold">{plan.name}</h3>
                  <p className="text-sm text-muted">{plan.credits} criativos</p>
                </div>
              </div>

              {/* Preço */}
              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className="text-sm text-muted">R$</span>
                  <span className="text-4xl font-bold">{formatPrice(plan.price)}</span>
                </div>
                <p className="text-xs text-muted mt-1">
                  R$ {(plan.price / plan.credits).toFixed(2)} por criativo
                </p>
              </div>

              {/* Features */}
              <ul className="space-y-4 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center shrink-0 mt-0.5">
                      <Check size={12} className="text-success" />
                    </div>
                    <span className="text-sm text-foreground/80">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Botão */}
              <button
                onClick={() => handleBuy(plan)}
                disabled={buying}
                className={`w-full py-4 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-accent text-white hover:bg-accent-hover shadow-lg shadow-accent/25"
                    : "bg-card-hover border border-border text-foreground hover:border-accent hover:text-accent"
                } disabled:opacity-50`}
              >
                {buying ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : null}
                Adquirir Agora
              </button>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="max-w-md mx-auto bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3 mb-6">
          <X size={20} className="text-red-500 shrink-0" />
          <span className="text-red-400 text-sm">{error}</span>
        </div>
      )}

      {/* Modal CPF/Telefone */}
      {showForm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Finalizar Compra</h3>
              <button
                onClick={() => { setShowForm(false); setError(null); }}
                className="p-2 hover:bg-card-hover rounded-lg transition-colors"
              >
                <X size={20} className="text-muted" />
              </button>
            </div>

            {pendingPlan && (
              <div className="bg-accent-soft rounded-xl p-4 mb-6 flex items-center justify-between">
                <div>
                  <p className="font-semibold">{pendingPlan.name}</p>
                  <p className="text-xs text-muted">{pendingPlan.credits} créditos</p>
                </div>
                <p className="text-xl font-bold text-accent">R$ {formatPrice(pendingPlan.price)}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium block mb-2">CPF</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="Apenas números (11 dígitos)"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-sm font-medium block mb-2">Telefone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="DDD + número (ex: 51999999999)"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              {error && <p className="text-red-400 text-sm">{error}</p>}

              <button
                onClick={confirmBuy}
                disabled={buying}
                className="w-full py-4 bg-accent text-white rounded-xl font-semibold text-sm hover:bg-accent-hover transition-all disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-accent/25 mt-2"
              >
                {buying && <Loader2 size={18} className="animate-spin" />}
                Gerar QR Code Pix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Pix QR Code */}
      {showPixModal && pixCode && selectedPlan && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full mx-4 shadow-2xl overflow-hidden">
            {/* Header do modal */}
            <div className="bg-gradient-to-r from-accent/20 to-accent/5 p-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold">Pagamento Pix</h3>
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

            <div className="p-8">
              {/* Valor */}
              <div className="text-center mb-6">
                <p className="text-sm text-muted mb-1">Valor a pagar</p>
                <p className="text-4xl font-bold text-accent">
                  R$ {formatPrice(selectedPlan.price)}
                </p>
              </div>

              {/* QR Code */}
              <div className="flex justify-center mb-6">
                <div className="bg-white p-5 rounded-2xl shadow-inner">
                  <QRCode
                    value={pixCode}
                    size={250}
                    qrStyle="dots"
                    eyeRadius={8}
                    fgColor="#121212"
                  />
                </div>
              </div>

              {/* Copia e cola */}
              <button
                onClick={copyPixCode}
                className="w-full flex items-center justify-center gap-3 py-4 bg-card-hover border border-border rounded-xl text-sm font-medium hover:border-accent transition-all mb-4"
              >
                {copied ? (
                  <>
                    <CheckCircle size={18} className="text-success" />
                    <span className="text-success">Código copiado!</span>
                  </>
                ) : (
                  <>
                    <Copy size={18} />
                    Copiar código Pix (copia e cola)
                  </>
                )}
              </button>

              {/* Info */}
              <div className="bg-accent-soft rounded-xl p-4 flex items-start gap-3">
                <div className="w-2 h-2 bg-accent rounded-full mt-1.5 shrink-0 animate-pulse" />
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
