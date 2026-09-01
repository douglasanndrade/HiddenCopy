"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, MailCheck } from "lucide-react";
import { supabase } from "@/lib/supabase-browser";
import { isDevBypass } from "@/lib/dev-bypass";
import { traduzirErro } from "@/lib/auth-errors";
import { AuthCard, authButtonClasses, authInputClasses } from "@/components/auth-background";

export default function RecuperarSenhaPage() {
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isDevBypass) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      });
      if (error) throw error;
      setEnviado(true);
    } catch (err) {
      setErro(traduzirErro(err, "Não foi possível enviar o email. Tente novamente"));
    } finally {
      setLoading(false);
    }
  };

  if (enviado) {
    return (
      <AuthCard titulo="Email enviado">
        <div className="flex flex-col items-center text-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center">
            <MailCheck size={26} className="text-accent" />
          </div>
          <p className="text-sm text-muted leading-relaxed">
            Se existe uma conta com <span className="text-foreground font-medium">{email}</span>,
            enviamos um link para redefinir a senha. O link vale por 1 hora.
          </p>
          <p className="text-xs text-muted/70">
            Não chegou? Confira a caixa de spam antes de pedir outro.
          </p>
          <Link
            href="/login"
            className="mt-2 text-sm text-muted hover:text-accent transition-colors duration-300 flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            Voltar para o login
          </Link>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard titulo="Recuperar senha">
      <p className="text-sm text-muted mb-5 leading-relaxed">
        Informe o email da sua conta. Enviamos um link para você criar uma senha nova.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="animate-fade-in">
          <label className="text-xs text-muted block mb-1.5 font-medium">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClasses}
            placeholder="seu@email.com"
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
          Enviar link
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/login"
          className="text-sm text-muted hover:text-accent transition-colors duration-300 inline-flex items-center gap-1.5"
        >
          <ArrowLeft size={14} />
          Voltar para o login
        </Link>
      </div>
    </AuthCard>
  );
}
