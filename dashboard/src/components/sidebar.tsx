"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, FlaskConical, CreditCard, User, LogOut, Shield } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const navItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/laboratorio", label: "Laboratório", icon: FlaskConical },
  { href: "/creditos", label: "Créditos", icon: CreditCard },
  { href: "/conta", label: "Minha Conta", icon: User },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, credits, signOut } = useAuth();

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r border-border flex flex-col z-50">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold tracking-tight">
          <span className="text-accent">Hidden</span>Copy
        </h1>
        <p className="text-xs text-muted mt-1">Laboratório de Áudio</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:text-foreground hover:bg-card-hover"
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}

        {isAdmin && (
          <Link
            href="/admin"
            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
              pathname.startsWith("/admin")
                ? "bg-accent-soft text-accent"
                : "text-muted hover:text-foreground hover:bg-card-hover"
            }`}
          >
            <Shield size={20} />
            Admin
          </Link>
        )}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <div className="bg-card-hover rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted">Créditos restantes</span>
            <span className="text-sm font-bold text-accent">{credits}</span>
          </div>
          <div className="w-full bg-background rounded-full h-1.5">
            <div
              className="bg-accent h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min((credits / 50) * 100, 100)}%` }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between px-2">
          <span className="text-xs text-muted truncate">{user?.email}</span>
          <button
            onClick={signOut}
            className="p-1.5 text-muted hover:text-accent transition-colors"
            title="Sair"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
