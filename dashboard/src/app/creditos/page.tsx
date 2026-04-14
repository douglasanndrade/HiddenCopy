"use client";

import { Check, Zap, Star, Crown, Loader2, Copy, CheckCircle } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { QRCode } from "react-qrcode-logo";

const plans = [
  {
    id: "teste",
    name: "Teste",
    credits: 5,
    price: "79,90",
    priceNum: 79.9,
    icon: Zap,
    features: [
      "5 processamentos",
      "Melhorar áudio",
      "Mesclar com música",
      "Download em MP4",
    ],
    popular: false,
  },
  {
    id: "basico",
    name: "Básico",
    credits: 10,
    price: "139,90",
    priceNum: 139.9,
    icon: Star,
    features: [
      "10 processamentos",
      "Melhorar áudio",
      "Mesclar com música",
      "Download em MP4",
      "Prioridade no processamento",
    ],
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    credits: 50,
    price: "349,90",
    priceNum: 349.9,
    icon: Crown,
    features: [
      "50 processamentos",
      "Melhorar áudio",
      "Mesclar com música",
      "Download em MP4",
      "Prioridade no processamento",
      "Suporte prioritário",
    ],
    popular: false,
  },
];

export default function Creditos() {
  const { credits, session, refreshCredits } = useAuth();
  const [buying, setBuying] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Dados do cliente para o Pix
  const [showForm, setShowForm] = useState(false);
  const [cpf, setCpf] = useState("");
  const [phone, setPhone] = useState("");
  const [pendingPlanId, setPendingPlanId] = useState<string | null>(null);

  const handleBuy = async (planId: string) => {
    setPendingPlanId(planId);
    setShowForm(true);
    setError(null);
  };

  const confirmBuy = async () => {
    if (!session || !pendingPlanId) return;
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
        body: JSON.stringify({ planId: pendingPlanId, cpf, phone }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao gerar pagamento");
      }

      const data = await res.json();
      setPixCode(data.pix_code);
      setSelectedPlan(pendingPlanId);

      // Poll para verificar se o pagamento foi confirmado
      const interval = setInterval(async () => {
        await refreshCredits();
      }, 5000);

      // Para de verificar após 15 minutos
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

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-2">Créditos</h1>
      <p className="text-muted mb-4">Cada processamento consome 1 crédito.</p>

      <div className="bg-card border border-border rounded-xl p-6 mb-10 inline-flex items-center gap-4">
        <div className="w-12 h-12 bg-accent-soft rounded-lg flex items-center justify-center">
          <Zap size={24} className="text-accent" />
        </div>
        <div>
          <p className="text-sm text-muted">Seus créditos</p>
          <p className="text-2xl font-bold">
            <span className="text-accent">{credits}</span> restantes
          </p>
        </div>
      </div>

      {/* QR Code do Pix */}
      {pixCode && (
        <div className="bg-card border border-accent/30 rounded-xl p-8 mb-10 max-w-md">
          <h3 className="text-lg font-semibold mb-4 text-center">
            Pague via Pix
          </h3>
          <div className="flex justify-center mb-4 bg-white p-4 rounded-lg">
            <QRCode value={pixCode} size={220} />
          </div>
          <button
            onClick={copyPixCode}
            className="w-full flex items-center justify-center gap-2 py-3 bg-card-hover border border-border rounded-lg text-sm hover:border-accent transition-all"
          >
            {copied ? (
              <>
                <CheckCircle size={16} className="text-success" />
                Copiado!
              </>
            ) : (
              <>
                <Copy size={16} />
                Copiar código Pix
              </>
            )}
          </button>
          <p className="text-xs text-muted text-center mt-3">
            Seus créditos serão adicionados automaticamente após o pagamento.
          </p>
        </div>
      )}

      {/* Formulário CPF/Telefone */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-card border border-border rounded-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Dados para o Pix</h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted block mb-1">CPF (apenas números)</label>
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="12345678900"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Telefone (apenas números)</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  placeholder="51999999999"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent"
                />
              </div>
              {error && <p className="text-red-400 text-sm">{error}</p>}
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowForm(false); setError(null); }}
                  className="flex-1 py-2.5 bg-card-hover border border-border rounded-lg text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmBuy}
                  disabled={buying}
                  className="flex-1 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {buying && <Loader2 size={14} className="animate-spin" />}
                  Gerar Pix
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <h2 className="text-xl font-semibold mb-6">Adquirir Créditos</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.name}
              className={`relative bg-card border rounded-xl p-6 flex flex-col ${
                plan.popular
                  ? "border-accent shadow-lg shadow-accent/5"
                  : "border-border"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-accent text-white text-xs font-bold px-3 py-1 rounded-full">
                  POPULAR
                </div>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-accent-soft rounded-lg flex items-center justify-center">
                  <Icon size={20} className="text-accent" />
                </div>
                <div>
                  <h3 className="font-semibold">{plan.name}</h3>
                  <p className="text-xs text-muted">{plan.credits} criativos</p>
                </div>
              </div>

              <div className="mb-6">
                <span className="text-3xl font-bold">R$ {plan.price}</span>
              </div>

              <ul className="space-y-3 mb-6 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm text-muted">
                    <Check size={16} className="text-success shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleBuy(plan.id)}
                disabled={buying}
                className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
                  plan.popular
                    ? "bg-accent text-white hover:bg-accent-hover"
                    : "bg-card-hover border border-border text-foreground hover:border-accent"
                } disabled:opacity-50`}
              >
                {buying && selectedPlan === plan.id && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                Adquirir
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
