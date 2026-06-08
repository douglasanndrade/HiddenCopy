"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase-browser";
import type { User, Session } from "@supabase/supabase-js";

const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

interface AuthState {
  user: User | null;
  session: Session | null;
  credits: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  signOut: () => Promise<void>;
}

const fakeUser = {
  id: "dev-user-local",
  email: "dev@local",
  app_metadata: {},
  user_metadata: {},
  aud: "authenticated",
  created_at: new Date().toISOString(),
} as unknown as User;

const fakeSession = {
  access_token: "dev-mode-token",
  refresh_token: "dev-mode-refresh",
  expires_in: 3600,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  token_type: "bearer",
  user: fakeUser,
} as unknown as Session;

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  credits: 0,
  loading: true,
  refreshCredits: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(DEV_MODE ? fakeUser : null);
  const [session, setSession] = useState<Session | null>(DEV_MODE ? fakeSession : null);
  const [credits, setCredits] = useState(DEV_MODE ? 9999 : 0);
  const [loading, setLoading] = useState(!DEV_MODE);

  const refreshCredits = async () => {
    if (DEV_MODE) {
      setCredits(9999);
      return;
    }
    if (!session) return;
    try {
      const res = await fetch("/api/credits", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setCredits(data.credits);
      }
    } catch {}
  };

  const signOut = async () => {
    if (DEV_MODE) return;
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCredits(0);
  };

  useEffect(() => {
    if (DEV_MODE) return;

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (DEV_MODE) return;
    if (session) refreshCredits();
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, credits, loading, refreshCredits, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
