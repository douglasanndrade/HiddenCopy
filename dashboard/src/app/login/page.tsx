"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const errosAuth: Record<string, string> = {
  "Invalid login credentials": "Email ou senha incorretos",
  "Email not confirmed": "Email não confirmado. Verifique sua caixa de entrada",
  "User already registered": "Este email já está cadastrado",
  "Password should be at least 6 characters": "A senha deve ter pelo menos 6 caracteres",
  "Unable to validate email address: invalid format": "Formato de email inválido",
  "Signup requires a valid password": "Informe uma senha válida",
  "Email rate limit exceeded": "Muitas tentativas. Aguarde alguns minutos",
  "For security purposes, you can only request this after": "Muitas tentativas. Aguarde alguns minutos e tente novamente",
  "User not found": "Usuário não encontrado",
  "Network request failed": "Erro de conexão. Verifique sua internet",
  "Failed to fetch": "Erro de conexão. Verifique sua internet",
  "fetch failed": "Erro de conexão. Verifique sua internet",
};

function traduzirErro(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  for (const [en, pt] of Object.entries(errosAuth)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return pt;
  }
  return "Erro ao autenticar. Tente novamente";
}

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
      router.push("/");
    } catch (err) {
      setError(traduzirErro(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClasses =
    "w-full bg-background/50 border border-glass-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40 focus:shadow-[0_0_15px_rgba(254,44,85,0.15)] transition-all duration-300";

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      {/* ===== Animated background orbs ===== */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-30 blur-[120px] animate-float animate-gradient"
        style={{
          background:
            "radial-gradient(circle, rgba(254,44,85,0.5), rgba(168,44,254,0.3), transparent 70%)",
          backgroundSize: "200% 200%",
          animationDelay: "0s",
        }}
      />
      <div
        className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-25 blur-[100px] animate-float animate-gradient"
        style={{
          background:
            "radial-gradient(circle, rgba(100,50,255,0.5), rgba(254,44,85,0.3), transparent 70%)",
          backgroundSize: "200% 200%",
          animationDelay: "1.5s",
          animationDuration: "4s",
        }}
      />
      <div
        className="absolute top-[40%] right-[15%] w-[350px] h-[350px] rounded-full opacity-20 blur-[90px] animate-float animate-gradient"
        style={{
          background:
            "radial-gradient(circle, rgba(254,44,85,0.4), rgba(60,60,200,0.3), transparent 70%)",
          backgroundSize: "200% 200%",
          animationDelay: "0.8s",
          animationDuration: "5s",
        }}
      />
      <div
        className="absolute top-[10%] right-[40%] w-[250px] h-[250px] rounded-full opacity-15 blur-[80px] animate-float"
        style={{
          background:
            "radial-gradient(circle, rgba(120,40,200,0.5), transparent 70%)",
          animationDelay: "2s",
          animationDuration: "6s",
        }}
      />

      {/* ===== Login card ===== */}
      <div className="relative z-10 w-full max-w-md p-4 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-10 animate-scale-in">
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="text-gradient">Hidden</span>
            <span className="text-foreground">Copy</span>
          </h1>
          <p className="text-muted text-sm mt-3 tracking-wide animate-fade-in delay-2">
            Laboratório de Áudio
          </p>
        </div>

        {/* Glass card */}
        <div className="glass-card rounded-2xl p-8 hover:glow-accent transition-shadow duration-500 animate-fade-in-up delay-1">
          <h2 className="text-xl font-semibold mb-6 text-foreground">
            {isSignUp ? "Criar Conta" : "Entrar"}
          </h2>

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
                  className={inputClasses}
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
                className={inputClasses}
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="animate-fade-in delay-2">
              <label className="text-xs text-muted block mb-1.5 font-medium">
                Senha
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClasses}
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

            <button
              type="submit"
              disabled={loading}
              className="btn-glow w-full py-3.5 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl font-bold text-sm tracking-wide hover:shadow-[0_0_30px_rgba(254,44,85,0.3)] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
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
        </div>
      </div>
    </div>
  );
}
