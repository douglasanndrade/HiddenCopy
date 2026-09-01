"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { isDevBypass } from "@/lib/dev-bypass";
import { traduzirErro } from "@/lib/auth-errors";
import { AuthCard, authButtonClasses, authInputClasses } from "@/components/auth-background";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isDevBypass) router.replace("/dashboard");
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDevBypass) {
      router.push("/dashboard");
      return;
    }
    setError("");
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
      router.push("/dashboard");
    } catch (err) {
      setError(traduzirErro(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCard titulo={isSignUp ? "Criar Conta" : "Entrar"}>
      <form onSubmit={handleSubmit} className="space-y-5">
        {isSignUp && (
          <div className="animate-fade-in">
            <label className="text-xs text-muted block mb-1.5 font-medium">
              Nome
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authInputClasses}
              placeholder="Seu nome"
              required
            />
          </div>
        )}

        <div className="animate-fade-in delay-1">
          <label className="text-xs text-muted block mb-1.5 font-medium">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClasses}
            placeholder="seu@email.com"
            required
          />
        </div>

        <div className="animate-fade-in delay-2">
          <div className="flex items-baseline justify-between mb-1.5">
            <label className="text-xs text-muted font-medium">Senha</label>
            {!isSignUp && (
              <Link
                href="/recuperar-senha"
                className="text-xs text-muted hover:text-accent transition-colors duration-300"
              >
                Esqueci minha senha
              </Link>
            )}
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={authInputClasses}
            placeholder="Mínimo 6 caracteres"
            minLength={6}
            required
          />
        </div>

        {error && (
          <div className="glass rounded-xl p-3 border-red-500/30 bg-red-500/10 animate-fade-in">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button type="submit" disabled={loading} className={authButtonClasses}>
          {loading && <Loader2 size={18} className="animate-spin" />}
          {isSignUp ? "Criar Conta" : "Entrar"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError("");
          }}
          className="text-sm text-muted hover:text-accent transition-colors duration-300"
        >
          {isSignUp ? "Já tem conta? Entrar" : "Não tem conta? Criar"}
        </button>
      </div>
    </AuthCard>
  );
}
