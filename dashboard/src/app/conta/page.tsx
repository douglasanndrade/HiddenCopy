"use client";

import { User, Mail, Calendar, CreditCard } from "lucide-react";

export default function MinhaConta() {
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
                <p className="font-medium">Usuário</p>
                <p className="text-sm text-muted">usuario@email.com</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-border">
              <div>
                <label className="text-xs text-muted block mb-1">Nome</label>
                <input
                  type="text"
                  defaultValue="Usuário"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-muted block mb-1">Email</label>
                <input
                  type="email"
                  defaultValue="usuario@email.com"
                  className="w-full bg-background border border-border rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>
            </div>

            <button className="px-5 py-2.5 bg-accent text-white rounded-lg text-sm font-medium hover:bg-accent-hover transition-all">
              Salvar Alterações
            </button>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Assinatura</h2>
          <div className="space-y-3">
            <InfoRow
              icon={<CreditCard size={16} />}
              label="Plano Atual"
              value="Teste (5 créditos)"
            />
            <InfoRow
              icon={<Calendar size={16} />}
              label="Válido até"
              value="--"
            />
            <InfoRow
              icon={<Mail size={16} />}
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
