"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabase-browser";
import type { User, Session } from "@supabase/supabase-js";
import { isDevBypass, MOCK_USER, MOCK_SESSION } from "./dev-bypass";

interface AuthState {
  user: User | null;
  session: Session | null;
  credits: number;
  loading: boolean;
  refreshCredits: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState>({
  user: null,
  session: null,
  credits: 0,
  loading: true,
  refreshCredits: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(
    isDevBypass ? (MOCK_USER as unknown as User) : null
  );
  const [session, setSession] = useState<Session | null>(
    isDevBypass ? (MOCK_SESSION as unknown as Session) : null
  );
  const [credits, setCredits] = useState(0);
  const [loading, setLoading] = useState(!isDevBypass);

  const refreshCredits = async () => {
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
    if (isDevBypass) return; // bypass: stay logged in
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setCredits(0);
  };

  useEffect(() => {
    if (isDevBypass) return; // bypass: no Supabase listeners

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
    if (session) refreshCredits();
  }, [session]);

  return (
    <AuthContext.Provider value={{ user, session, credits, loading, refreshCredits, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
