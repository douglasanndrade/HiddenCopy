"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  Zap,
  Shield,
  Clock,
  CheckCircle,
  ChevronRight,
  Play,
  Star,
} from "lucide-react";

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Se já logado, vai pro dashboard
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  if (loading || user) return null;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background orbs */}
      <div
        className="absolute top-[-15%] left-[-8%] w-[500px] h-[500px] rounded-full opacity-20 blur-[120px] animate-float animate-gradient"
        style={{
          background: "radial-gradient(circle, rgba(254,44,85,0.5), rgba(168,44,254,0.3), transparent 70%)",
          backgroundSize: "200% 200%",
        }}
      />
      <div
        className="absolute bottom-[-10%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-15 blur-[100px] animate-float"
        style={{
          background: "radial-gradient(circle, rgba(100,50,255,0.4), transparent 70%)",
          animationDelay: "1.5s",
          animationDuration: "5s",
        }}
      />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-5 sm:px-8 lg:px-16 py-5">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
          <span className="text-gradient">Hidden</span>
          <span className="text-foreground">Copy</span>
        </h1>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-muted hover:text-foreground transition-colors px-4 py-2"
          >
            Entrar
          </Link>
          <Link
            href="/login"
            className="text-sm font-semibold bg-gradient-to-r from-accent to-accent-hover text-white px-5 py-2.5 rounded-xl btn-glow hover:shadow-[0_0_25px_rgba(254,44,85,0.3)] transition-all"
          >
            Começar Agora
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 px-5 sm:px-8 lg:px-16 pt-12 sm:pt-20 pb-16 sm:pb-24 max-w-5xl mx-auto text-center">
        <div className="animate-fade-in-up">
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-4 py-2 text-xs font-medium text-muted mb-6">
            <Zap size={14} className="text-accent" />
            Plataforma #1 de camuflagem de áudio
          </div>

          <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            Camufle o áudio dos seus{" "}
            <span className="text-gradient">criativos</span>{" "}
            em segundos
          </h2>

          <p className="text-muted text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
            Transforme seus vídeos com processamento profissional de áudio.
            Camuflagem inteligente, mesclagem com música e download instantâneo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 bg-gradient-to-r from-accent to-accent-hover text-white font-bold px-8 py-4 rounded-xl text-base btn-glow glow-accent hover:shadow-[0_0_40px_rgba(254,44,85,0.3)] transition-all"
            >
              <Play size={18} />
              Começar Grátis
            </Link>
            <Link
              href="#precos"
              className="flex items-center gap-2 glass-card text-foreground font-semibold px-8 py-4 rounded-xl text-base hover:border-accent/50 transition-all"
            >
              Ver Preços
              <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 px-5 sm:px-8 lg:px-16 pb-16 sm:pb-24 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 sm:gap-6">
          <div className="glass-card rounded-2xl p-6 sm:p-8 text-center animate-fade-in-up delay-1 hover:scale-[1.02] transition-all">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mx-auto mb-5">
              <Shield size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">Camuflagem Profissional</h3>
            <p className="text-sm text-muted leading-relaxed">
              Algoritmos avançados que alteram o áudio de forma imperceptível, mantendo a qualidade original.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 text-center animate-fade-in-up delay-2 hover:scale-[1.02] transition-all">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mx-auto mb-5">
              <Clock size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">Processamento Rápido</h3>
            <p className="text-sm text-muted leading-relaxed">
              Seus vídeos processados em segundos. Upload, processa e baixa sem complicação.
            </p>
          </div>

          <div className="glass-card rounded-2xl p-6 sm:p-8 text-center animate-fade-in-up delay-3 hover:scale-[1.02] transition-all">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mx-auto mb-5">
              <Zap size={24} className="text-white" />
            </div>
            <h3 className="text-lg font-bold mb-2">Mesclagem com Música</h3>
            <p className="text-sm text-muted leading-relaxed">
              Adicione música de fundo com ducking automático. O áudio original abaixa quando tem voz.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="precos" className="relative z-10 px-5 sm:px-8 lg:px-16 pb-16 sm:pb-24 max-w-5xl mx-auto">
        <div className="text-center mb-10 animate-fade-in">
          <h2 className="text-2xl sm:text-4xl font-extrabold mb-3">
            Planos <span className="text-gradient">simples</span>
          </h2>
          <p className="text-muted text-base">Pague por crédito. Sem mensalidade.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          {/* Teste */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col animate-fade-in-up delay-1 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Teste</h3>
                <p className="text-xs text-muted">5 créditos</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-sm text-muted">R$</span>
              <span className="text-3xl font-bold ml-1">79,90</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {["5 processamentos", "Camuflar vídeo", "Camuflar vídeo + áudio", "Download em MP4"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted">
                  <CheckCircle size={14} className="text-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="w-full py-3.5 glass border border-border/50 text-center rounded-xl font-semibold text-sm hover:border-accent hover:text-accent transition-all"
            >
              Começar
            </Link>
          </div>

          {/* Básico - Popular */}
          <div className="glass-card rounded-2xl flex flex-col animate-fade-in-up delay-2 hover:scale-[1.02] transition-all border-2 border-accent glow-accent overflow-hidden">
            <div className="bg-gradient-to-r from-accent to-yellow-500 animate-gradient text-white text-xs font-bold text-center py-2.5 tracking-widest uppercase">
              Mais Popular
            </div>
            <div className="p-6 sm:p-8 flex flex-col flex-1">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-accent to-yellow-400 flex items-center justify-center text-white">
                  <Star size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Básico</h3>
                  <p className="text-xs text-muted">10 créditos</p>
                </div>
              </div>
              <div className="mb-6">
                <span className="text-sm text-muted">R$</span>
                <span className="text-3xl font-bold ml-1">139,90</span>
              </div>
              <ul className="space-y-3 mb-8 flex-1">
                {["10 processamentos", "Camuflar vídeo", "Camuflar vídeo + áudio", "Download em MP4", "Prioridade no processamento"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-muted">
                    <CheckCircle size={14} className="text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href="/login"
                className="w-full py-3.5 bg-gradient-to-r from-accent to-accent-hover text-white text-center rounded-xl font-bold text-sm btn-glow glow-accent hover:shadow-accent/40 transition-all"
              >
                Começar Agora
              </Link>
            </div>
          </div>

          {/* Pro */}
          <div className="glass-card rounded-2xl p-6 sm:p-8 flex flex-col animate-fade-in-up delay-3 hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white">
                <Zap size={24} />
              </div>
              <div>
                <h3 className="text-lg font-bold">Pro</h3>
                <p className="text-xs text-muted">50 créditos</p>
              </div>
            </div>
            <div className="mb-6">
              <span className="text-sm text-muted">R$</span>
              <span className="text-3xl font-bold ml-1">349,90</span>
            </div>
            <ul className="space-y-3 mb-8 flex-1">
              {["50 processamentos", "Camuflar vídeo", "Camuflar vídeo + áudio", "Download em MP4", "Prioridade no processamento", "Suporte prioritário"].map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-muted">
                  <CheckCircle size={14} className="text-success shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/login"
              className="w-full py-3.5 glass border border-border/50 text-center rounded-xl font-semibold text-sm hover:border-accent hover:text-accent transition-all"
            >
              Começar
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/30 py-8 px-5 sm:px-8 lg:px-16 text-center">
        <p className="text-xs text-muted">
          &copy; {new Date().getFullYear()} HiddenCopy. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}
