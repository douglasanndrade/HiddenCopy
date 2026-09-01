"use client";

import { useState } from "react";
import { CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { useAuth } from "@/lib/auth-context";
import { isDevBypass } from "@/lib/dev-bypass";
import { traduzirErro } from "@/lib/auth-errors";
import { authInputClasses } from "./auth-background";

export function AlterarSenhaCard() {
  const { user } = useAuth();
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setSucesso(false);

    if (novaSenha.length < 6) {
      setErro("A nova senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (novaSenha !== confirmacao) {
      setErro("As senhas não coincidem");
      return;
    }
    if (novaSenha === senhaAtual) {
      setErro("A nova senha precisa ser diferente da atual");
      return;
    }
    if (!user?.email) {
      setErro("Não foi possível identificar sua conta. Entre novamente");
      return;
    }

    setLoading(true);
    try {
      // O updateUser do Supabase nao pede a senha atual. Sem esta conferencia,
      // qualquer sessao esquecida aberta trocaria a senha e tomaria a conta.
      const { error: erroLogin } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: senhaAtual,
      });
      if (erroLogin) {
        setErro("Senha atual incorreta");
        return;
      }

      const { error } = await supabase.auth.updateUser({ password: novaSenha });
      if (error) throw error;

      setSucesso(true);
      setSenhaAtual("");
      setNovaSenha("");
      setConfirmacao("");
    } catch (err) {
      setErro(traduzirErro(err, "Não foi possível alterar a senha. Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in-up delay-3">
      <h2 className="text-lg font-semibold mb-5 flex items-center gap-2.5">
        <span className="w-8 h-8 rounded-full bg-accent-soft flex items-center justify-center shrink-0">
          <KeyRound size={16} className="text-accent" />
        </span>
        Segurança
      </h2>

      {isDevBypass ? (
        <p className="text-sm text-muted">
          Troca de senha indisponível no modo de desenvolvimento.
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-sm">
          <div>
            <label className="text-xs text-muted block mb-1.5 font-medium">
              Senha atual
            </label>
            <input
              type="password"
              value={senhaAtual}
              onChange={(e) => setSenhaAtual(e.target.value)}
              className={authInputClasses}
              placeholder="Sua senha de hoje"
              autoComplete="current-password"
              required
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5 font-medium">
              Nova senha
            </label>
            <input
              type="password"
              value={novaSenha}
              onChange={(e) => setNovaSenha(e.target.value)}
              className={authInputClasses}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          <div>
            <label className="text-xs text-muted block mb-1.5 font-medium">
              Confirmar nova senha
            </label>
            <input
              type="password"
              value={confirmacao}
              onChange={(e) => setConfirmacao(e.target.value)}
              className={authInputClasses}
              placeholder="Repita a nova senha"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </div>

          {erro && (
            <div className="glass rounded-xl p-3 border-red-500/30 bg-red-500/10 animate-fade-in">
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}

          {sucesso && (
            <div className="glass rounded-xl p-3 border-success/30 bg-success/10 animate-fade-in flex items-center gap-2">
              <CheckCircle2 size={16} className="text-success shrink-0" />
              <p className="text-success text-sm">Senha alterada com sucesso</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-glow w-full sm:w-auto flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold py-3 px-5 rounded-xl transition-all duration-200 disabled:opacity-50"
          >
            {loading && <Loader2 size={16} className="animate-spin" />}
            Alterar senha
          </button>
        </form>
      )}
    </div>
  );
}
