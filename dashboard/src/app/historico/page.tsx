"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Clock,
  Download,
  FileVideo,
  History,
  Loader2,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { readError } from "@/lib/http";

type Item = {
  id: string;
  arquivo: string;
  nome_original: string;
  modo: string;
  tamanho_bytes: number;
  criado_em: string;
  expira_em: string;
  profiles?: { email?: string; name?: string } | null;
};

const MODO_LABEL: Record<string, string> = {
  suave: "Cloaker",
  oculto: "Cloaker + Áudio oculto",
  clean: "Só metadados",
};

function formatarTamanho(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(1)} MB`;
}

function diasRestantes(expiraEm: string) {
  const ms = new Date(expiraEm).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function Historico() {
  const { user, session } = useAuth();
  const [itens, setItens] = useState<Item[]>([]);
  const [retencaoDias, setRetencaoDias] = useState(60);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<string | null>(null);
  const [verTodos, setVerTodos] = useState(false);

  // Mesma regra da sidebar, pra tela e API concordarem sobre quem e admin
  const adminEmails = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());
  const isAdmin = !!user?.email && adminEmails.includes(user.email.toLowerCase());

  const carregar = useCallback(async () => {
    if (!session) return;
    setCarregando(true);
    setErro(null);
    try {
      const res = await fetch(`/api/historico${verTodos ? "?todos=1" : ""}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(await readError(res, "Falha ao carregar o histórico"));
      const data = await res.json();
      setItens(data.itens ?? []);
      setRetencaoDias(data.retencaoDias ?? 60);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao carregar o histórico");
    } finally {
      setCarregando(false);
    }
  }, [session, verTodos]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const baixar = async (item: Item) => {
    if (!session) return;
    setBaixando(item.id);
    setErro(null);
    try {
      const res = await fetch(`/api/historico/${item.id}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(await readError(res, "Falha ao baixar"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = item.nome_original;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao baixar");
    } finally {
      setBaixando(null);
    }
  };

  const excluir = async (item: Item) => {
    if (!session) return;
    setExcluindo(item.id);
    setErro(null);
    try {
      const res = await fetch(`/api/historico/${item.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(await readError(res, "Falha ao excluir"));
      setItens((atual) => atual.filter((i) => i.id !== item.id));
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Falha ao excluir");
    } finally {
      setExcluindo(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
      <div className="animate-fade-in mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          <span className="text-gradient">Histórico</span>
        </h1>
        <p className="text-muted text-sm sm:text-base">
          Seus vídeos processados ficam disponíveis por {retencaoDias} dias.
        </p>
      </div>

      {isAdmin && (
        <div className="mb-5 flex gap-2 animate-fade-in">
          <button
            onClick={() => setVerTodos(false)}
            className={`flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-xl transition-all duration-200 ${
              verTodos ? "glass-card text-muted hover:bg-card-hover" : "bg-accent text-white"
            }`}
          >
            <History size={15} />
            Meus
          </button>
          <button
            onClick={() => setVerTodos(true)}
            className={`flex items-center gap-2 text-sm font-medium py-2 px-4 rounded-xl transition-all duration-200 ${
              verTodos ? "bg-accent text-white" : "glass-card text-muted hover:bg-card-hover"
            }`}
          >
            <Users size={15} />
            Todos os usuários
          </button>
        </div>
      )}

      {erro && (
        <div className="glass rounded-xl p-3 border-red-500/30 bg-red-500/10 animate-fade-in mb-5 flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <p className="text-red-400 text-sm">{erro}</p>
        </div>
      )}

      {carregando ? (
        <div className="flex items-center justify-center gap-3 py-16 text-muted">
          <Loader2 size={20} className="animate-spin text-accent" />
          <span className="text-sm">Carregando...</span>
        </div>
      ) : itens.length === 0 ? (
        <div className="glass-card rounded-2xl p-10 text-center animate-fade-in-up">
          <div className="w-14 h-14 rounded-full bg-accent-soft flex items-center justify-center mx-auto mb-4">
            <FileVideo size={26} className="text-accent" />
          </div>
          <p className="text-foreground font-medium mb-1">Nada por aqui ainda</p>
          <p className="text-muted text-sm mb-5">
            Os vídeos que você processar aparecem nesta lista.
          </p>
          <Link
            href="/laboratorio"
            className="btn-glow inline-flex items-center gap-2 bg-accent hover:bg-accent-hover text-white font-semibold py-2.5 px-5 rounded-xl transition-all duration-200"
          >
            Ir ao Laboratório
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {itens.map((item, i) => {
            const dias = diasRestantes(item.expira_em);
            return (
              <div
                key={item.id}
                className="glass-card rounded-2xl p-4 sm:p-5 animate-fade-in-up flex flex-col sm:flex-row sm:items-center gap-4"
                style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}
              >
                <div className="w-11 h-11 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
                  <FileVideo size={20} className="text-accent" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-foreground font-medium text-sm truncate">
                    {item.nome_original}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-muted">
                    <span>{MODO_LABEL[item.modo] ?? item.modo}</span>
                    <span>{formatarTamanho(item.tamanho_bytes)}</span>
                    <span>{new Date(item.criado_em).toLocaleDateString("pt-BR")}</span>
                    <span
                      className={`flex items-center gap-1 ${dias <= 7 ? "text-yellow-400" : ""}`}
                    >
                      <Clock size={12} />
                      {dias === 0 ? "expira hoje" : `expira em ${dias} d`}
                    </span>
                  </div>
                  {verTodos && item.profiles?.email && (
                    <p className="text-xs text-muted/70 mt-1 truncate">{item.profiles.email}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => baixar(item)}
                    disabled={baixando === item.id}
                    className="btn-glow flex items-center justify-center gap-2 bg-accent hover:bg-accent-hover text-white text-sm font-semibold py-2.5 px-4 rounded-xl transition-all duration-200 disabled:opacity-50 flex-1 sm:flex-none"
                  >
                    {baixando === item.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Download size={15} />
                    )}
                    Baixar
                  </button>
                  <button
                    onClick={() => excluir(item)}
                    disabled={excluindo === item.id}
                    title="Excluir"
                    className="glass-card flex items-center justify-center p-2.5 rounded-xl text-muted hover:text-red-400 hover:bg-card-hover transition-all duration-200 disabled:opacity-50"
                  >
                    {excluindo === item.id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      <Trash2 size={15} />
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
