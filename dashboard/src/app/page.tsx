"use client";

import { FlaskConical, Music, Merge, Zap, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";

export default function Home() {
  const { credits, session } = useAuth();
  const [melhorados, setMelhorados] = useState(0);
  const [mesclados, setMesclados] = useState(0);

  useEffect(() => {
    if (!session) return;

    fetch("/api/stats", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setMelhorados(data.melhorados || 0);
          setMesclados(data.mesclados || 0);
        }
      })
      .catch(() => {});
  }, [session]);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8 lg:mb-10">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-3 animate-fade-in">
          Bem-vindo ao <span className="text-gradient">HiddenCopy</span>
        </h1>
        <p className="text-muted text-base sm:text-lg animate-fade-in delay-1">
          Melhore e mescle os audios dos seus criativos em segundos.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 lg:mb-10">
        <div
          className={`glass-card rounded-2xl p-5 sm:p-6 animate-fade-in-up delay-1 transition-all duration-300 hover:scale-[1.02] hover:border-accent/50 ${
            credits > 0 ? "glow-accent" : ""
          }`}
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
              <Zap size={20} className="text-white" />
            </div>
            <span className="text-sm text-muted font-medium">
              Creditos Disponiveis
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-gradient">
            {credits}
          </p>
          <p className="text-xs text-muted mt-1.5">creditos restantes</p>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in-up delay-2 transition-all duration-300 hover:scale-[1.02] hover:border-accent/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
              <Music size={20} className="text-white" />
            </div>
            <span className="text-sm text-muted font-medium">
              Audios Melhorados
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-white">
            {melhorados}
          </p>
          <p className="text-xs text-muted mt-1.5">este mes</p>
        </div>

        <div className="glass-card rounded-2xl p-5 sm:p-6 animate-fade-in-up delay-3 transition-all duration-300 hover:scale-[1.02] hover:border-accent/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20">
              <Merge size={20} className="text-white" />
            </div>
            <span className="text-sm text-muted font-medium">
              Audios Mesclados
            </span>
          </div>
          <p className="text-3xl sm:text-4xl font-bold text-white">
            {mesclados}
          </p>
          <p className="text-xs text-muted mt-1.5">este mes</p>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        <Link href="/laboratorio?modo=melhorar" className="group">
          <div className="glass-card rounded-2xl p-6 sm:p-8 animate-fade-in-up delay-3 transition-all duration-300 hover:scale-[1.02] hover:border-accent/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mb-5 transition-all duration-300 group-hover:shadow-accent/40 group-hover:shadow-xl">
                  <Music size={26} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">
                  Melhorar Audio
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  Envie um MP4 e receba com audio normalizado, equalizado e sem
                  ruido. Ideal para criativos com audio fraco ou com barulho.
                </p>
              </div>
              <ChevronRight
                size={20}
                className="text-muted mt-1 transition-all duration-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-accent"
              />
            </div>
          </div>
        </Link>

        <Link href="/laboratorio?modo=mesclar" className="group">
          <div className="glass-card rounded-2xl p-6 sm:p-8 animate-fade-in-up delay-4 transition-all duration-300 hover:scale-[1.02] hover:border-accent/50">
            <div className="flex items-start justify-between">
              <div>
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-hover flex items-center justify-center shadow-lg shadow-accent/20 mb-5 transition-all duration-300 group-hover:shadow-accent/40 group-hover:shadow-xl">
                  <Merge size={26} className="text-white" />
                </div>
                <h3 className="text-lg font-bold mb-2 text-foreground">
                  Mesclar com Musica
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  Envie um MP4 + um MP3 e receba o video com a musica de fundo
                  mesclada. Ducking automatico quando tem voz.
                </p>
              </div>
              <ChevronRight
                size={20}
                className="text-muted mt-1 transition-all duration-300 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-1 group-hover:text-accent"
              />
            </div>
          </div>
        </Link>
      </div>
    </div>
  );
}
