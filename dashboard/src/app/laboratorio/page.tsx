"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Upload,
  Music,
  Download,
  Loader2,
  CheckCircle,
  X,
  AlertTriangle,
  FileVideo,
  FileAudio,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

const errosMap: Record<string, string> = {
  "Failed to fetch": "Erro de conexão. Verifique sua internet",
  "fetch failed": "Erro de conexão. Verifique sua internet",
  "Network request failed": "Erro de conexão. Verifique sua internet",
  "Load failed": "Erro de conexão. Verifique sua internet",
  "Não autenticado": "Sessão expirada. Faça login novamente",
  "Créditos insuficientes": "Créditos insuficientes. Adquira mais créditos",
  "Request Entity Too Large": "Arquivo muito grande. Tente um menor",
  "Payload Too Large": "Arquivo muito grande. Tente um menor",
};

function traduzirErro(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  for (const [en, pt] of Object.entries(errosMap)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return pt;
  }
  return msg;
}

type Modo = "melhorar" | "mesclar";

const progressSteps = [
  { at: 0, label: "Enviando arquivos..." },
  { at: 8, label: "Analisando áudio do vídeo..." },
  { at: 20, label: "Extraindo faixas de áudio..." },
  { at: 35, label: "Aplicando filtros de camuflagem..." },
  { at: 55, label: "Processando frequências..." },
  { at: 70, label: "Remasterizando áudio..." },
  { at: 85, label: "Renderizando vídeo final..." },
  { at: 95, label: "Finalizando..." },
];

/* ─── DropZone Sub-component ─── */

function DropZone({
  label,
  sublabel,
  accept,
  file,
  onFile,
  icon,
}: {
  label: string;
  sublabel?: string;
  accept: string;
  file: File | null;
  onFile: (f: File | null) => void;
  icon: React.ReactNode;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) onFile(droppedFile);
    },
    [onFile]
  );

  const formatSize = (bytes: number) => {
    const mb = bytes / 1024 / 1024;
    return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative glass-card border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all duration-300 cursor-pointer ${
        dragOver
          ? "animate-border-glow bg-accent-soft border-accent"
          : file
          ? "border-success/50 glow-success"
          : "border-border hover:border-accent/40"
      }`}
    >
      <input
        type="file"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] || null)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      {file ? (
        <div className="flex items-center justify-center gap-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-success/10 shrink-0">
            {accept.includes("video") ? (
              <FileVideo size={24} className="text-success" />
            ) : (
              <FileAudio size={24} className="text-success" />
            )}
          </div>
          <div className="text-left min-w-0">
            <p className="text-sm font-semibold text-foreground truncate max-w-[200px] sm:max-w-[300px]">
              {file.name}
            </p>
            <span className="inline-block mt-1 text-[11px] font-medium px-2 py-0.5 rounded-full bg-success/10 text-success">
              {formatSize(file.size)}
            </span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFile(null);
            }}
            className="relative z-20 ml-auto p-2 rounded-lg bg-card hover:bg-red-500/15 transition-all group"
          >
            <X
              size={16}
              className="text-muted group-hover:text-red-400 transition-colors"
            />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-muted">
          <div className="animate-float">{icon}</div>
          <div>
            <p className="text-sm font-semibold text-foreground/80">{label}</p>
            {sublabel && <p className="text-xs mt-0.5 text-accent/70">{sublabel}</p>}
            <p className="text-xs mt-1 text-muted">
              Arraste ou clique para selecionar
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default function Laboratorio() {
  const { session, credits, refreshCredits } = useAuth();

  const modo: Modo = "mesclar";
  const musicVolume = -10;
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Limpar intervalo ao desmontar
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  const startProgressSimulation = (fileSizeMB: number) => {
    const estimatedSeconds = Math.max(15, Math.min(fileSizeMB * 1.5, 120));
    const stepDuration = (estimatedSeconds * 1000) / 100;
    let currentPercent = 0;

    setProgressPercent(0);
    setProgress(progressSteps[0].label);

    progressInterval.current = setInterval(() => {
      currentPercent += 1;

      if (currentPercent >= 95) {
        if (progressInterval.current) clearInterval(progressInterval.current);
        return;
      }

      setProgressPercent(currentPercent);

      const step = [...progressSteps].reverse().find((s) => currentPercent >= s.at);
      if (step) setProgress(step.label);
    }, stepDuration);
  };

  const stopProgressSimulation = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const handleProcess = async () => {
    if (!videoFile) return;
    if (modo === "mesclar" && !musicFile) return;
    if (!session) return;

    if (credits < 1) {
      setError("Créditos insuficientes. Adquira mais créditos.");
      return;
    }

    setProcessing(true);
    setError(null);
    setDownloadUrl(null);

    const fileSizeMB = videoFile.size / 1024 / 1024;
    startProgressSimulation(fileSizeMB);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("modo", modo);
      if (modo === "mesclar" && musicFile) {
        formData.append("music", musicFile);
        formData.append("volume", musicVolume.toString());
      }

      const res = await fetch("/api/process", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar. Tente novamente");
      }

      stopProgressSimulation();
      setProgressPercent(100);
      setProgress("Concluído!");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      await refreshCredits();
    } catch (err) {
      stopProgressSimulation();
      setError(traduzirErro(err));
      setProgress("");
      setProgressPercent(0);
    } finally {
      setProcessing(false);
    }
  };

  const isComplete = progressPercent === 100 && !!downloadUrl;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient">
          Laboratório
        </h1>
        <p className="text-muted mt-2 text-sm sm:text-base">
          Camufle o áudio do seu vídeo de forma discreta e profissional.
        </p>
      </div>

      {/* Upload sections */}
      <div className="space-y-6 animate-fade-in-up delay-1">
        <DropZone
          label="Vídeo MP4"
          accept="video/mp4"
          file={videoFile}
          onFile={setVideoFile}
          icon={<Upload size={40} className="text-muted" />}
        />

        <DropZone
          label="Áudio White MP3"
          sublabel="Aqui vai sua copy white"
          accept="audio/mpeg"
          file={musicFile}
          onFile={setMusicFile}
          icon={<Music size={40} className="text-muted" />}
        />

        {/* Error */}
        {error && (
          <div className="glass-card rounded-xl p-4 flex items-center gap-3 border-l-2 border-red-500/70 animate-fade-in">
            <X size={20} className="text-red-400 shrink-0" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {/* Progress */}
        {progress && !error && (
          <div
            className={`glass-card rounded-xl p-5 space-y-4 transition-all duration-500 ${
              isComplete
                ? "border-l-2 border-success glow-success"
                : "border-l-2 border-accent"
            }`}
          >
            <div className="flex items-center gap-3">
              {isComplete ? (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success/15 animate-scale-in">
                  <CheckCircle size={18} className="text-success" />
                </div>
              ) : (
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-soft">
                  <Loader2 size={18} className="text-accent animate-spin" />
                </div>
              )}
              <span className="text-sm font-medium text-foreground">
                {progress}
              </span>
              {!isComplete && (
                <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent">
                  {progressPercent}%
                </span>
              )}
            </div>
            {!isComplete && (
              <div className="w-full bg-background rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500 ease-out relative overflow-hidden"
                  style={{ width: `${progressPercent}%` }}
                >
                  <div className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up delay-3">
          <button
            onClick={handleProcess}
            disabled={processing || !videoFile || (modo === "mesclar" && !musicFile)}
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl font-semibold text-sm btn-glow hover:glow-accent transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {processing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Music size={18} />
            )}
            {processing ? "Processando..." : "Processar"}
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={`${(videoFile?.name?.replace(/\.[^.]+$/, "") || "video")}${musicFile ? "+" + (musicFile.name?.replace(/\.[^.]+$/, "") || "audio") : ""}+hiddencopy.mp4`}
              className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-semibold text-sm btn-glow glow-success hover:opacity-90 transition-all duration-300 animate-scale-in"
            >
              <Download size={18} />
              Baixar Resultado
            </a>
          )}
        </div>

        {/* Warning box */}
        {downloadUrl && (
          <div className="glass-card rounded-xl p-5 flex items-start gap-4 border-l-2 border-yellow-500/70 animate-fade-in-up delay-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-yellow-500/10 shrink-0">
              <AlertTriangle
                size={20}
                className="text-yellow-500 animate-pulse-glow"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-400">
                Baixe seu vídeo agora!
              </p>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Nenhuma mídia fica salva em nossos servidores. Após sair desta
                página, o arquivo não estará mais disponível.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
