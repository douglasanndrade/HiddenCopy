// Orbs animadas do fundo das telas de autenticacao (login, recuperar e
// redefinir senha). Markup puramente decorativo, sem estado -- fica num
// componente so pra nao viver copiado em tres paginas.
export function AuthBackground() {
  return (
    <>
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
    </>
  );
}

/** Classe dos inputs das telas de auth -- mesma em login, recuperar e redefinir. */
export const authInputClasses =
  "w-full bg-background/50 border border-glass-border rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted/60 focus:outline-none focus:border-accent/40 focus:shadow-[0_0_15px_rgba(254,44,85,0.15)] transition-all duration-300";

/** Botao primario das telas de auth. */
export const authButtonClasses =
  "btn-glow w-full py-3.5 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl font-bold text-sm tracking-wide hover:shadow-[0_0_30px_rgba(254,44,85,0.3)] transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2 mt-2";

/** Moldura comum: fundo animado, logo e card de vidro. */
export function AuthCard({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-background overflow-hidden">
      <AuthBackground />

      <div className="relative z-10 w-full max-w-md p-4 animate-fade-in-up">
        <div className="text-center mb-10 animate-scale-in">
          <h1 className="text-5xl font-extrabold tracking-tight">
            <span className="text-gradient">Hidden</span>
            <span className="text-foreground">Copy</span>
          </h1>
          <p className="text-muted text-sm mt-3 tracking-wide animate-fade-in delay-2">
            Laboratório de Áudio
          </p>
        </div>

        <div className="glass-card rounded-2xl p-8 hover:glow-accent transition-shadow duration-500 animate-fade-in-up delay-1">
          <h2 className="text-xl font-semibold mb-6 text-foreground">{titulo}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}
