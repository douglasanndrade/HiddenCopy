"use client";

import { User, Mail, Calendar, CreditCard, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function MinhaConta() {
  const { user, credits } = useAuth();

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-2">Minha Conta</h1>
      <p className="text-muted mb-8">Gerencie seus dados e assinatura.</p>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Perfil</h2>
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-accent-soft rounded-full flex items-center justify-center">
                <User size={32} className="text-accent" />
              </div>
              <div>
                <p className="font-medium">{user?.user_metadata?.name || user?.email?.split("@")[0] || "Usuário"}</p>
                <p className="text-sm text-muted">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Assinatura</h2>
          <div className="space-y-3">
            <InfoRow
              icon={<Zap size={16} />}
              label="Créditos"
              value={`${credits}`}
              valueClass="text-accent"
            />
            <InfoRow
              icon={<Mail size={16} />}
              label="Email"
              value={user?.email || "--"}
            />
            <InfoRow
              icon={<Calendar size={16} />}
              label="Cadastro"
              value={user?.created_at ? new Date(user.created_at).toLocaleDateString("pt-BR") : "--"}
            />
            <InfoRow
              icon={<CreditCard size={16} />}
              label="Status"
              value="Ativo"
              valueClass="text-success"
            />
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
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2 text-sm text-muted">
        {icon}
        {label}
      </div>
      <span className={`text-sm font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
