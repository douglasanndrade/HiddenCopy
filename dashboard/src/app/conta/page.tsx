"use client";

import { User, Mail, Calendar, CreditCard, Zap, FlaskConical } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import Link from "next/link";

export default function MinhaConta() {
  const { user, credits } = useAuth();

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl">
      {/* Page Header */}
      <div className="animate-fade-in mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          <span className="text-gradient">Minha Conta</span>
        </h1>
        <p className="text-muted text-sm sm:text-base">
          Gerencie seus dados e assinatura.
        </p>
      </div>

      <div className="space-y-4 sm:space-y-6">
        {/* Profile Card */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in-up delay-1">
          <h2 className="text-lg font-semibold mb-5">Perfil</h2>
          <div className="flex items-center gap-4 sm:gap-5">
            <div className="animate-scale-in shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-accent-soft flex items-center justify-center border-2 border-accent"
                   style={{ borderImage: "linear-gradient(135deg, var(--accent), var(--accent-hover)) 1", borderImageSlice: 1, borderRadius: "9999px" }}>
                <div className="w-full h-full rounded-full bg-accent-soft flex items-center justify-center">
                  <User size={28} className="text-accent sm:hidden" />
                  <User size={36} className="text-accent hidden sm:block" />
                </div>
              </div>
            </div>
            <div>
              <p className="text-xl font-bold text-foreground">
                {user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário"}
              </p>
              <p className="text-sm text-muted mt-0.5">{user?.email}</p>
            </div>
          </div>
        </div>

        {/* Subscription Card */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in-up delay-2">
          <div className="mb-5">
            <h2 className="text-lg font-semibold pb-2 border-b border-accent/20">
              Assinatura
            </h2>
          </div>
          <div className="space-y-1">
            <InfoRow
              icon={<Zap size={16} />}
              label="Créditos"
              value={`${credits}`}
              valueClass="text-gradient text-base font-bold"
              highlight
            />
            <InfoRow
              icon={<Mail size={16} />}
              label="Email"
              value={user?.email || "--"}
            />
            <InfoRow
              icon={<Calendar size={16} />}
              label="Cadastro"
              value={
                user?.created_at
                  ? new Date(user.created_at).toLocaleDateString("pt-BR")
                  : "--"
              }
            />
            <InfoRow
              icon={<CreditCard size={16} />}
              label="Status"
              value="Ativo"
              statusDot
            />
          </div>
        </div>

        {/* Quick Actions Card */}
        <div className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in-up delay-3">
          <h2 className="text-lg font-semibold mb-5">Ações Rápidas</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/creditos"
              className="btn-glow flex-1 flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold py-3 px-5 rounded-xl transition-all duration-200"
            >
              <Zap size={18} />
              Comprar Créditos
            </Link>
            <Link
              href="/laboratorio"
              className="glass-card flex-1 flex items-center justify-center gap-2 font-semibold py-3 px-5 rounded-xl text-foreground hover:bg-card-hover transition-all duration-200"
            >
              <FlaskConical size={18} />
              Ir ao Laboratório
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
  valueClass = "",
  highlight = false,
  statusDot = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
  highlight?: boolean;
  statusDot?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-3 px-2 rounded-lg hover:bg-card-hover/50 transition-colors">
      <div className="flex items-center gap-3 text-sm text-muted">
        <div className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
          {icon}
        </div>
        {label}
      </div>
      {statusDot ? (
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success" />
          </span>
          <span className="text-sm font-bold text-success">{value}</span>
        </div>
      ) : (
        <span
          className={`text-sm font-medium ${
            highlight ? "text-lg font-bold" : ""
          } ${valueClass}`}
        >
          {value}
        </span>
      )}
    </div>
  );
}
