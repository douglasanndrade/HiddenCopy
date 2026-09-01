"use client";

import { useAuth } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./sidebar";

// Recuperacao de senha precisa ser publica: quem esqueceu a senha chega aqui
// deslogado, e o link do email cai direto em /redefinir-senha.
const PAGINAS_PUBLICAS = ["/", "/login", "/recuperar-senha", "/redefinir-senha"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isPublicPage = PAGINAS_PUBLICAS.includes(pathname);

  useEffect(() => {
    if (!loading && !user && !isPublicPage) {
      router.push("/login");
    }
  }, [user, loading, isPublicPage, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background animate-fade-in">
        <div className="text-center flex flex-col items-center gap-4">
          {/* Animated logo with pulsing ring */}
          <div className="relative flex items-center justify-center">
            {/* Outer pulsing ring */}
            <span className="absolute w-20 h-20 rounded-full border-2 border-accent/30 animate-pulse-glow" />
            {/* Inner accent dot */}
            <span className="absolute w-3 h-3 rounded-full bg-accent animate-float" style={{ top: -2, right: -2 }} />
            {/* Logo text */}
            <h1 className="text-3xl font-bold tracking-tight">
              <span className="text-gradient-shine">Hidden</span>
              <span className="text-foreground">Copy</span>
            </h1>
          </div>
          <p className="text-muted text-sm animate-fade-in delay-2">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isPublicPage) {
    return <div className="w-full">{children}</div>;
  }

  if (!user) return null;

  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-0 lg:ml-64 pt-14 lg:pt-0 min-h-screen">
        <div className="animate-fade-in">
          {children}
        </div>
      </main>
    </>
  );
}
