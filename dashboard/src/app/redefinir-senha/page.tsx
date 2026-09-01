"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { isDevBypass } from "@/lib/dev-bypass";
import { traduzirErro } from "@/lib/auth-errors";
import { AuthCard, authButtonClasses, authInputClasses } from "@/components/auth-background";

type Estado = "verificando" | "pronto" | "linkInvalido" | "sucesso";

export default function RedefinirSenhaPage() {
  const [estado, setEstado] = useState<Estado>("verificando");
  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isDevBypass) {
      router.replace("/dashboard");
      return;
    }

    let ativo = true;

    // O link do email chega com os tokens no fragmento da URL e o supabase-js
    // (flowType implicit, detectSessionInUrl ligado) troca isso por uma sessao
    // sozinho. getSession() so resolve depois desse processamento, entao da pra
    // decidir aqui se o link era valido.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (ativo && sessao) setEstado("pronto");
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!ativo) return;
      if (session) setEstado("pronto");
      else setEstado((atual) => (atual === "verificando" ? "linkInvalido" : atual));
    });

    return () => {
      ativo = false;
      subscription.unsubscribe();
    };
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");

    if (senha.length < 6) {
      setErro("A senha deve ter pelo menos 6 caracteres");
      return;
    }
    if (senha !== confirmacao) {
      setErro("As senhas não coincidem");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: senha });
      if (error) throw error;
      setEstado("sucesso");
      setTimeout(() => router.replace("/dashboard"), 2500);
    } catch (err) {
      setErro(traduzirErro(err, "Não foi possível alterar a senha. Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  if (estado === "verificando") {
    return (
      <AuthCard titulo="Redefinir senha">
        <div className="flex items-center justify-center gap-3 py-6 text-muted">
          <Loader2 size={20} className="animate-spin text-accent" />
          <span className="text-sm">Validando o link...</span>
        </div>
      </AuthCard>
    );
  }

  if (estado === "linkInvalido") {
    return (
      <AuthCard titulo="Link inválido">
        <div className="flex flex-col items-center text-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center">
            <AlertTriangle size={26} className="text-red-400" />
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Este link de recuperação expirou ou já foi usado. Peça um novo para
            continuar.
          </p>
          <Link href="/recuperar-senha" className={`${authButtonClasses} no-underline`}>
            Pedir novo link
          </Link>
        </div>
      </AuthCard>
    );
  }

  if (estado === "sucesso") {
    return (
      <AuthCard titulo="Senha alterada">
        <div className="flex flex-col items-center text-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-success/10 flex items-center justify-center">
            <CheckCircle2 size={26} className="text-success" />
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Pronto. Sua senha foi atualizada e você já está conectado.
          </p>
          <Link href="/dashboard" className={`${authButtonClasses} no-underline`}>
            Ir para o dashboard
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Criar nova senha">
      <p className="text-sm text-muted mb-5 leading-relaxed">
        Escolha uma senha nova para a sua conta.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="animate-fade-in">
          <label className="text-xs text-muted block mb-1.5 font-medium">
            Nova senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className={authInputClasses}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
        </div>

        <div className="animate-fade-in delay-1">
          <label className="text-xs text-muted block mb-1.5 font-medium">
            Confirmar nova senha
          </label>
          <input
            type="password"
            value={confirmacao}
            onChange={(e) => setConfirmacao(e.target.value)}
            className={authInputClasses}
            placeholder="Repita a senha"
            minLength={6}
            required
          />
        </div>

        {erro && (
          <div className="glass rounded-xl p-3 border-red-500/30 bg-red-500/10 animate-fade-in">
            <p className="text-red-400 text-sm">{erro}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className={authButtonClasses}>
          {loading && <Loader2 size={18} className="animate-spin" />}
          Salvar nova senha
        </button>
      </form>
    </AuthCard>
  );
}
