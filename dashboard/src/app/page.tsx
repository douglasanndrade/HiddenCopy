"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Zap,
  Shield,
  Clock,
  CheckCircle,
  ChevronRight,
  Play,
  Star,
  Crown,
  Upload,
  Music,
  Wand2,
  Download,
  ArrowRight,
  Lock,
  Eye,
  Headphones,
  Video,
  BarChart3,
  Users,
  MessageCircle,
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  credits: number;
  price: number;
  features: string[];
  popular: boolean;
  icon: string;
}

const iconMap: Record<string, React.ReactNode> = {
  zap: <Zap size={24} />,
  star: <Star size={24} />,
  crown: <Crown size={24} />,
};

const tierGradients: Record<string, string> = {
  zap: "from-blue-500 to-cyan-400",
  star: "from-accent to-yellow-400",
  crown: "from-purple-500 to-pink-500",
};

function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("visible");
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return ref;
}

function RevealSection({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useReveal();
  return <div ref={ref} className={`reveal ${className}`}>{children}</div>;
}

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  useEffect(() => {
    fetch("/api/plans")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.plans?.length) setPlans(data.plans);
      })
      .catch(() => {})
      .finally(() => setPlansLoading(false));
  }, []);

  if (loading || user) return null;

  const formatPrice = (price: number) =>
    price.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* ===== BACKGROUND ORBS ===== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div
          className="absolute top-[-20%] left-[-15%] w-[700px] h-[700px] rounded-full opacity-20 blur-[150px] animate-orb-1 animate-gradient"
          style={{
            background: "radial-gradient(circle, rgba(254,44,85,0.6), rgba(168,44,254,0.3), transparent 70%)",
            backgroundSize: "200% 200%",
          }}
        />
        <div
          className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] rounded-full opacity-15 blur-[130px] animate-orb-2 animate-gradient"
          style={{
            background: "radial-gradient(circle, rgba(80,40,255,0.5), rgba(254,44,85,0.2), transparent 70%)",
            backgroundSize: "200% 200%",
            animationDelay: "2s",
          }}
        />
        <div
          className="absolute top-[40%] left-[50%] w-[400px] h-[400px] rounded-full opacity-10 blur-[120px] animate-orb-1"
          style={{
            background: "radial-gradient(circle, rgba(254,44,85,0.4), transparent 70%)",
            animationDelay: "5s",
            animationDuration: "30s",
          }}
        />
      </div>

      {/* ===== NAV ===== */}
      <nav className="relative z-10 glass border-b border-glass-border sticky top-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-5 sm:px-8 py-4">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight animate-fade-in-down">
            <span className="text-gradient">Hidden</span>
            <span className="text-foreground">Copy</span>
          </h1>
          <div className="flex items-center gap-2 sm:gap-4 animate-fade-in-down delay-1">
            <a href="#como-funciona" className="hidden sm:block text-sm text-muted hover:text-foreground transition-colors px-3 py-2">
              Como Funciona
            </a>
            <a href="#precos" className="hidden sm:block text-sm text-muted hover:text-foreground transition-colors px-3 py-2">
              Preços
            </a>
            <Link href="/login" className="text-sm text-muted hover:text-foreground transition-colors px-3 py-2">
              Entrar
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-gradient-to-r from-accent to-accent-hover text-white px-5 py-2.5 rounded-xl btn-glow hover:shadow-[0_0_25px_rgba(254,44,85,0.3)] transition-all"
            >
              Começar
            </Link>
          </div>
        </div>
      </nav>

      {/* ===== HERO ===== */}
      <section className="relative z-10 px-5 sm:px-8 pt-16 sm:pt-28 pb-20 sm:pb-32 max-w-5xl mx-auto text-center">
        <div className="animate-slide-up">
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-5 py-2.5 text-xs font-medium text-muted mb-8 animate-pulse-glow">
            <Zap size={14} className="text-accent" />
            Plataforma #1 de camuflagem de áudio para criativos
          </div>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold leading-[1.1] mb-7 animate-slide-up delay-1">
          Camufle seus{" "}
          <span className="text-gradient">criativos</span>
          <br className="hidden sm:block" />
          {" "}de forma{" "}
          <span className="text-gradient-shine">indetectável</span>
        </h2>

        <p className="text-muted text-base sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed animate-slide-up delay-2">
          Processamento profissional de áudio com inteligência artificial.
          Camuflagem, mesclagem com música e download instantâneo.
          Tudo em menos de 30 segundos.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up delay-3">
          <Link
            href="/login"
            className="group flex items-center gap-3 bg-gradient-to-r from-accent to-accent-hover text-white font-bold px-10 py-4.5 rounded-2xl text-base btn-glow glow-accent hover:shadow-[0_0_50px_rgba(254,44,85,0.35)] transition-all duration-300 hover:scale-[1.02]"
          >
            <Play size={20} />
            Começar Agora
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </Link>
          <a
            href="#como-funciona"
            className="flex items-center gap-2 glass-card text-foreground font-semibold px-8 py-4.5 rounded-2xl text-base hover:border-accent/50 transition-all duration-300"
          >
            Como Funciona
            <ChevronRight size={18} />
          </a>
        </div>

        {/* Social proof */}
        <div className="flex items-center justify-center gap-6 sm:gap-10 mt-16 animate-slide-up delay-4">
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold stat-number">500+</p>
            <p className="text-xs text-muted mt-1">Vídeos Processados</p>
          </div>
          <div className="w-px h-10 bg-border/50" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold stat-number">99%</p>
            <p className="text-xs text-muted mt-1">Taxa de Aprovação</p>
          </div>
          <div className="w-px h-10 bg-border/50" />
          <div className="text-center">
            <p className="text-2xl sm:text-3xl font-bold stat-number">&lt;30s</p>
            <p className="text-xs text-muted mt-1">Tempo Médio</p>
          </div>
        </div>
      </section>

      {/* ===== COMO FUNCIONA ===== */}
      <section id="como-funciona" className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-32 max-w-5xl mx-auto">
        <RevealSection className="text-center mb-14">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">Passo a passo</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">
            Como <span className="text-gradient">funciona</span>
          </h2>
          <p className="text-muted text-base max-w-xl mx-auto">
            3 passos simples para camuflar seus criativos de forma profissional.
          </p>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <RevealSection>
            <div className="glass-card rounded-2xl p-7 sm:p-8 text-center h-full hover:scale-[1.03] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-4 left-4 text-6xl font-black text-accent/5">1</div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mx-auto mb-6 group-hover:shadow-accent/40 transition-all">
                  <Upload size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-3">Envie seu vídeo</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Faça upload do seu MP4. Se quiser mesclar com música, envie também o MP3.
                  Aceita vídeos de até 500MB.
                </p>
              </div>
            </div>
          </RevealSection>

          <RevealSection>
            <div className="glass-card rounded-2xl p-7 sm:p-8 text-center h-full hover:scale-[1.03] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-4 left-4 text-6xl font-black text-accent/5">2</div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mx-auto mb-6 group-hover:shadow-accent/40 transition-all">
                  <Wand2 size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-3">Processamos automaticamente</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Nossa IA analisa e camufla o áudio com filtros avançados.
                  Equalização, remoção de ruído e mesclagem inteligente com ducking.
                </p>
              </div>
            </div>
          </RevealSection>

          <RevealSection>
            <div className="glass-card rounded-2xl p-7 sm:p-8 text-center h-full hover:scale-[1.03] transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-4 left-4 text-6xl font-black text-accent/5">3</div>
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mx-auto mb-6 group-hover:shadow-accent/40 transition-all">
                  <Download size={28} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-3">Baixe o resultado</h3>
                <p className="text-sm text-muted leading-relaxed">
                  Seu vídeo processado fica pronto em segundos. Baixe em MP4 de alta qualidade.
                  Nenhum arquivo fica salvo nos nossos servidores.
                </p>
              </div>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===== MODOS ===== */}
      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-32 max-w-5xl mx-auto">
        <RevealSection className="text-center mb-14">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">Dois modos</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">
            Escolha o <span className="text-gradient">modo ideal</span>
          </h2>
          <p className="text-muted text-base max-w-xl mx-auto">
            Cada criativo exige uma abordagem diferente. Escolha a que faz mais sentido.
          </p>
        </RevealSection>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          <RevealSection>
            <div className="glass-card rounded-2xl p-8 sm:p-10 h-full hover:scale-[1.02] hover:border-accent/40 transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center shadow-lg text-white group-hover:shadow-blue-500/30 transition-all">
                  <Video size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Camuflar Vídeo</h3>
                  <p className="text-xs text-muted mt-0.5">1 crédito por uso</p>
                </div>
              </div>
              <p className="text-sm text-muted leading-relaxed mb-6">
                Envie seu MP4 e receba com áudio completamente camuflado.
                O sistema aplica filtros de frequência, normalização e alteração de pitch
                de forma sutil, tornando o áudio único e indetectável por sistemas de verificação.
              </p>
              <ul className="space-y-2.5">
                {["Alteração de frequências", "Normalização profissional", "Remoção de ruído", "Mantém qualidade original"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted">
                    <CheckCircle size={14} className="text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </RevealSection>

          <RevealSection>
            <div className="glass-card rounded-2xl p-8 sm:p-10 h-full hover:scale-[1.02] hover:border-accent/40 transition-all duration-300 group">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-accent to-yellow-400 flex items-center justify-center shadow-lg text-white group-hover:shadow-accent/30 transition-all">
                  <Headphones size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Camuflar Vídeo + Áudio</h3>
                  <p className="text-xs text-muted mt-0.5">1 crédito por uso</p>
                </div>
              </div>
              <p className="text-sm text-muted leading-relaxed mb-6">
                Envie um MP4 + um MP3 e receba o vídeo com a música de fundo mesclada.
                O sistema usa ducking automático — a música abaixa nos momentos de fala
                e sobe nos silêncios, criando um resultado profissional.
              </p>
              <ul className="space-y-2.5">
                {["Mesclagem inteligente", "Ducking automático (voz/música)", "Volume ajustável", "Camuflagem + música de fundo"].map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm text-muted">
                    <CheckCircle size={14} className="text-success shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </RevealSection>
        </div>
      </section>

      {/* ===== POR QUE ESCOLHER ===== */}
      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-32 max-w-5xl mx-auto">
        <RevealSection className="text-center mb-14">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">Diferenciais</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">
            Por que usar o <span className="text-gradient">HiddenCopy</span>?
          </h2>
        </RevealSection>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
          {[
            { icon: Shield, title: "100% Seguro", desc: "Nenhum arquivo fica salvo nos nossos servidores. Após o download, tudo é deletado automaticamente." },
            { icon: Zap, title: "Ultra Rápido", desc: "Processamento em menos de 30 segundos. Sem fila de espera, sem limitação de horário." },
            { icon: Eye, title: "Indetectável", desc: "Algoritmos avançados que alteram o áudio de forma imperceptível para ouvidos humanos e sistemas automatizados." },
            { icon: Lock, title: "Privacidade Total", desc: "Sem rastreamento, sem logs de conteúdo. Seus criativos são só seus." },
            { icon: BarChart3, title: "Dashboard Completo", desc: "Acompanhe seus créditos, histórico de processamentos e estatísticas em tempo real." },
            { icon: MessageCircle, title: "Suporte Humano", desc: "Precisa de ajuda? Fale direto com a gente pelo Instagram. Resposta rápida e humanizada." },
          ].map(({ icon: Icon, title, desc }) => (
            <RevealSection key={title}>
              <div className="glass-card rounded-2xl p-6 h-full hover:scale-[1.02] hover:border-accent/30 transition-all duration-300">
                <div className="w-11 h-11 rounded-lg bg-accent-soft flex items-center justify-center mb-4">
                  <Icon size={20} className="text-accent" />
                </div>
                <h3 className="text-base font-bold mb-2">{title}</h3>
                <p className="text-sm text-muted leading-relaxed">{desc}</p>
              </div>
            </RevealSection>
          ))}
        </div>
      </section>

      {/* ===== PRECOS ===== */}
      <section id="precos" className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-32 max-w-5xl mx-auto">
        <RevealSection className="text-center mb-14">
          <p className="text-accent text-sm font-semibold uppercase tracking-widest mb-3">Preços</p>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold mb-4">
            Planos <span className="text-gradient">simples e diretos</span>
          </h2>
          <p className="text-muted text-base max-w-xl mx-auto">
            Pague por crédito. Sem mensalidade, sem surpresas. Use quando quiser.
          </p>
        </RevealSection>

        {plansLoading ? (
          <div className="text-center text-muted py-12">Carregando planos...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
            {plans.map((plan) => (
              <RevealSection key={plan.id}>
                <div
                  className={`glass-card rounded-2xl flex flex-col overflow-hidden h-full hover:scale-[1.02] transition-all duration-300 ${
                    plan.popular ? "border-2 border-accent glow-accent" : "hover:border-accent/40"
                  }`}
                >
                  {plan.popular && (
                    <div className="bg-gradient-to-r from-accent to-yellow-500 animate-gradient text-white text-xs font-bold text-center py-2.5 tracking-widest uppercase">
                      Mais Popular
                    </div>
                  )}
                  <div className="p-7 sm:p-8 flex flex-col flex-1">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${tierGradients[plan.icon] || "from-accent to-accent"} flex items-center justify-center text-white shadow-lg`}>
                        {iconMap[plan.icon] || <Zap size={24} />}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold">{plan.name}</h3>
                        <p className="text-xs text-muted">{plan.credits} créditos</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-1">
                        <span className="text-sm text-muted">R$</span>
                        <span className="text-3xl sm:text-4xl font-bold">{formatPrice(plan.price)}</span>
                      </div>
                      <p className="text-xs text-muted mt-1">
                        R$ {(plan.price / plan.credits).toFixed(2)} por criativo
                      </p>
                    </div>

                    <ul className="space-y-3 mb-8 flex-1">
                      {plan.features.map((f: string) => (
                        <li key={f} className="flex items-center gap-2.5 text-sm text-muted">
                          <CheckCircle size={14} className="text-success shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>

                    <Link
                      href="/login"
                      className={`w-full py-4 rounded-xl font-bold text-sm text-center transition-all duration-300 ${
                        plan.popular
                          ? "bg-gradient-to-r from-accent to-accent-hover text-white btn-glow glow-accent hover:shadow-accent/40"
                          : "glass border border-border/50 text-foreground hover:border-accent hover:text-accent"
                      }`}
                    >
                      Começar Agora
                    </Link>
                  </div>
                </div>
              </RevealSection>
            ))}
          </div>
        )}
      </section>

      {/* ===== CTA FINAL ===== */}
      <section className="relative z-10 px-5 sm:px-8 pb-20 sm:pb-28 max-w-4xl mx-auto">
        <RevealSection>
          <div className="relative glass-card rounded-3xl p-10 sm:p-16 text-center overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/10 via-transparent to-purple-500/5 pointer-events-none" />
            <div className="relative">
              <h2 className="text-2xl sm:text-4xl font-extrabold mb-4">
                Pronto para <span className="text-gradient">camuflar</span> seus criativos?
              </h2>
              <p className="text-muted text-base max-w-lg mx-auto mb-8">
                Comece agora. Crie sua conta em segundos e processe seu primeiro vídeo.
              </p>
              <Link
                href="/login"
                className="group inline-flex items-center gap-3 bg-gradient-to-r from-accent to-accent-hover text-white font-bold px-10 py-4.5 rounded-2xl text-base btn-glow glow-accent-strong hover:shadow-[0_0_60px_rgba(254,44,85,0.3)] transition-all duration-300 hover:scale-[1.03]"
              >
                <Play size={20} />
                Criar Conta Grátis
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </RevealSection>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 border-t border-border/20 py-10 px-5 sm:px-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">
              <span className="text-gradient">Hidden</span>
              <span className="text-foreground">Copy</span>
            </h1>
            <span className="text-xs text-muted">Laboratório de Áudio</span>
          </div>
          <div className="flex items-center gap-6">
            <a
              href="https://www.instagram.com/douglasanndrade2/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-muted hover:text-accent transition-colors"
            >
              Instagram
            </a>
            <Link href="/ajuda" className="text-xs text-muted hover:text-accent transition-colors">
              Ajuda
            </Link>
            <Link href="/login" className="text-xs text-muted hover:text-accent transition-colors">
              Entrar
            </Link>
          </div>
          <p className="text-xs text-muted">
            &copy; {new Date().getFullYear()} HiddenCopy
          </p>
        </div>
      </footer>
    </div>
  );
}
