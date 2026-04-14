"use client";

import { useAuth } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./sidebar";

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!loading && !user && !isLoginPage) {
      router.push("/login");
    }
  }, [user, loading, isLoginPage, router]);

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-2">
            <span className="text-accent">Hidden</span>Copy
          </h1>
          <p className="text-muted text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (isLoginPage) {
    return <div className="w-full">{children}</div>;
  }

  if (!user) return null;

  return (
    <>
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen">{children}</main>
    </>
  );
}
