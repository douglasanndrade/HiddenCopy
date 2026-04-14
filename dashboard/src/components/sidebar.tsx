"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FlaskConical, CreditCard, User, LogOut, Shield, Menu, X, HelpCircle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useState, useEffect } from "react";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/laboratorio", label: "Laboratório", icon: FlaskConical },
  { href: "/creditos", label: "Créditos", icon: CreditCard },
  { href: "/conta", label: "Minha Conta", icon: User },
  { href: "/ajuda", label: "Ajuda", icon: HelpCircle },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, credits, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  // Fechar drawer ao navegar
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloquear scroll do body quando drawer está aberto
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [open]);

  const creditPercent = Math.min((credits / 50) * 100, 100);
  const hasCredits = credits > 0;

  const allNavItems = [
    ...navItems,
    ...(isAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []),
  ];

  const sidebarContent = (
    <>
      {/* Logo area */}
      <div className="p-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            <span className="text-gradient">Hidden</span>
            <span className="text-foreground">Copy</span>
          </h1>
          <p className="text-xs text-muted mt-1">Laboratório de Áudio</p>
        </div>
        {/* Botão fechar só no mobile */}
        <button
          onClick={() => setOpen(false)}
          className="lg:hidden p-2 -mr-2 text-muted hover:text-foreground transition-colors"
        >
          <X size={20} />
        </button>
      </div>
      {/* Gradient divider */}
      <div className="mx-4 h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent" />

      <nav className="flex-1 p-4 space-y-1 mt-2">
        {allNavItems.map((item, index) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;
          const delayClass = `delay-${Math.min(index + 1, 5)}`;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`animate-slide-in-left ${delayClass} relative flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              {/* Glowing left accent bar for active state */}
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-accent glow-accent" />
              )}
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Credits + logout section */}
      <div className="p-4 space-y-3">
        {/* Gradient divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-accent/20 to-transparent mb-1" />

        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-muted">Créditos restantes</span>
          </div>
          <div className="text-2xl font-bold text-accent tracking-tight mb-3">
            {credits}
          </div>
          <div className="w-full bg-background rounded-full h-2 overflow-hidden">
            <div
              className={`bg-accent h-2 rounded-full transition-all duration-500 ${
                hasCredits ? "animate-pulse-glow" : ""
              }`}
              style={{ width: `${creditPercent}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-2 py-1">
          <span className="text-xs text-muted truncate max-w-[170px]">{user?.email}</span>
          <button
            onClick={signOut}
            className="p-2 rounded-lg text-muted hover:text-red-400 hover:bg-red-500/10 hover:shadow-[0_0_12px_rgba(239,68,68,0.2)] transition-all duration-200"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Header mobile - glass background with bottom glow */}
      <header className="lg:hidden fixed top-0 left-0 right-0 h-14 glass flex items-center justify-between px-4 z-50 border-b border-glass-border shadow-[0_1px_12px_rgba(254,44,85,0.06)]">
        <button
          onClick={() => setOpen(true)}
          className="p-2 -ml-2 text-muted hover:text-foreground transition-colors"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-lg font-bold tracking-tight">
          <span className="text-gradient">Hidden</span>
          <span className="text-foreground">Copy</span>
        </h1>
        <div className="w-9" /> {/* Spacer para centralizar o título */}
      </header>

      {/* Sidebar desktop - fixa, glass morphism + noise */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-64 glass noise flex-col z-50 border-r border-glass-border">
        {sidebarContent}
      </aside>

      {/* Overlay mobile */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer mobile - glass background + noise */}
      <aside
        className={`lg:hidden fixed left-0 top-0 h-full w-72 glass noise flex flex-col z-50 border-r border-glass-border transition-transform duration-300 ease-in-out ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
