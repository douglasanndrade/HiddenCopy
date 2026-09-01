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
  Clock,
  Volume2,
  ShieldOff,
  Minimize2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { readError } from "@/lib/http";

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

type Modo = "suave" | "oculto";

// Pedacos de 8MB. Cada requisicao dura poucos segundos, entao nenhum proxy no
// caminho tem chance de cortar por tempo -- era isso que derrubava upload
// grande com 502 por volta dos 95s.
const TAMANHO_PARTE = 8 * 1024 * 1024;
const TENTATIVAS_POR_PARTE = 3;
/** Fatia da barra reservada ao envio; o resto e a fase de processamento. */
const FIM_ENVIO = 40;

async function enviarEmPartes(
  file: File,
  token: string,
  aoProgredir: (bytesEnviados: number) => void
): Promise<string> {
  const inicio = await fetch("/api/uploads", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!inicio.ok) throw new Error(await readError(inicio, "Falha ao iniciar o envio"));
  const { id } = await inicio.json();

  let offset = 0;
  let travas = 0;

  while (offset < file.size) {
    const anterior = offset;
    const fim = Math.min(offset + TAMANHO_PARTE, file.size);

    for (let tentativa = 1; tentativa <= TENTATIVAS_POR_PARTE; tentativa++) {
      try {
        const res = await fetch(`/api/uploads/${id}?offset=${offset}`, {
          method: "PUT",
          body: file.slice(offset, fim),
        });

        // 409: o servidor gravou uma quantidade diferente da que a gente acha
        // (pedaco caiu no meio). Ele diz onde parou de verdade e retomamos dali.
        if (res.status === 409) {
          const { offset: real } = await res.json();
          offset = real;
          break;
        }
        if (!res.ok) throw new Error(await readError(res, "Falha ao enviar o arquivo"));

        const { offset: novo } = await res.json();
        offset = novo;
        break;
      } catch (err) {
        if (tentativa === TENTATIVAS_POR_PARTE) throw err;
      }
    }

    // Rede muito ruim pode empurrar a gente pra tras varias vezes; sem isso o
    // laco poderia ficar girando pra sempre no browser do usuario.
    travas = offset === anterior ? travas + 1 : 0;
    if (travas > 5) throw new Error("Envio travou. Verifique sua conexão e tente de novo");

    aoProgredir(offset);
  }

  return id;
}

const MODE_LABELS: Record<Modo, { title: string; subtitle: string }> = {
  suave: {
    title: "Cloaker de Criativo",
    subtitle: "Padrão. Áudio quase natural.",
  },
  oculto: {
    title: "Cloaker de Criativo + Áudio Oculto",
    subtitle: "IA transcreve o áudio escondido em vez da voz original.",
  },
};

// Rotulos da fase de processamento. O envio tem progresso real proprio.
const progressSteps = [
  { at: 0, label: "Preparando processamento..." },
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

/* ─── Video duration probe (browser side) ─── */

function useVideoDuration(file: File | null) {
  const [duration, setDuration] = useState(0);
  useEffect(() => {
    if (!file) {
      setDuration(0);
      return;
    }
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    const onLoaded = () => {
      setDuration(video.duration || 0);
      URL.revokeObjectURL(url);
    };
    video.addEventListener("loadedmetadata", onLoaded);
    return () => {
      video.removeEventListener("loadedmetadata", onLoaded);
      URL.revokeObjectURL(url);
    };
  }, [file]);
  return duration;
}

function fmtMmss(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rest = s - m * 60;
  return `${String(m).padStart(2, "0")}:${rest.toFixed(2).padStart(5, "0")}`;
}

/* ─── Main Page ─── */

export default function Laboratorio() {
  const { session, credits, refreshCredits } = useAuth();

  const [modo, setModo] = useState<Modo>("suave");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [ocultoFile, setOcultoFile] = useState<File | null>(null);
  const [ocultoVolume, setOcultoVolume] = useState(0.005);
  const [startEnabled, setStartEnabled] = useState(false);
  const [startSec, setStartSec] = useState(0);
  const [cleanMetadata, setCleanMetadata] = useState(true);
  const [compressEnabled, setCompressEnabled] = useState(false);
  const [compressPct, setCompressPct] = useState(30);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  const duration = useVideoDuration(videoFile);

  // Limpar intervalo ao desmontar
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // Reset start time ao trocar de vídeo
  useEffect(() => {
    setStartSec(0);
  }, [videoFile]);

  // Roda so na fase de processamento, de `inicio` ate 95%. O envio agora tem
  // progresso de verdade; daqui pra frente o servidor nao tem como reportar
  // andamento, entao continua estimado.
  const startProgressSimulation = (fileSizeMB: number, inicio: number) => {
    const estimatedSeconds = Math.max(10, Math.min(fileSizeMB * 0.8, 180));
    const faixa = Math.max(1, 95 - inicio);
    const stepDuration = (estimatedSeconds * 1000) / faixa;
    let currentPercent = inicio;

    setProgressPercent(inicio);
    setProgress(progressSteps[0].label);

    progressInterval.current = setInterval(() => {
      currentPercent += 1;

      if (currentPercent >= 95) {
        if (progressInterval.current) clearInterval(progressInterval.current);
        return;
      }

      setProgressPercent(currentPercent);

      // Os rotulos foram escritos numa escala 0-100, mas a barra agora percorre
      // so de `inicio` a 95 -- por isso o rotulo sai da fracao dessa faixa.
      const fracao = ((currentPercent - inicio) / faixa) * 100;
      const step = [...progressSteps].reverse().find((s) => fracao >= s.at);
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
    if (modo === "oculto" && !ocultoFile) return;
    if (!session) return;

    if (credits < 1) {
      setError("Créditos insuficientes. Adquira mais créditos.");
      return;
    }

    setProcessing(true);
    setError(null);
    setDownloadUrl(null);

    const fileSizeMB = videoFile.size / 1024 / 1024;
    const totalBytes = videoFile.size + (modo === "oculto" && ocultoFile ? ocultoFile.size : 0);
    const token = session.access_token;

    try {
      // Fase 1: envio, com progresso real
      setProgressPercent(0);
      setProgress("Enviando vídeo...");

      let jaConcluidos = 0;
      const aoProgredir = (bytesDoAtual: number) => {
        const pct = ((jaConcluidos + bytesDoAtual) / totalBytes) * FIM_ENVIO;
        setProgressPercent(Math.min(Math.round(pct), FIM_ENVIO));
      };

      const videoUploadId = await enviarEmPartes(videoFile, token, aoProgredir);
      jaConcluidos = videoFile.size;

      let ocultoUploadId: string | undefined;
      if (modo === "oculto" && ocultoFile) {
        setProgress("Enviando áudio oculto...");
        ocultoUploadId = await enviarEmPartes(ocultoFile, token, aoProgredir);
      }

      // Fase 2: processamento
      startProgressSimulation(fileSizeMB, FIM_ENVIO);

      const res = await fetch("/api/process", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          videoUploadId,
          ocultoUploadId,
          videoNome: videoFile.name,
          ocultoNome: ocultoFile?.name,
          modo,
          oculto_volume: ocultoVolume,
          start_sec: startEnabled ? startSec : 0,
          clean_metadata: cleanMetadata,
          compress: compressEnabled,
          compress_pct: compressPct,
        }),
      });

      if (!res.ok) {
        throw new Error(await readError(res, "Erro ao processar. Tente novamente"));
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
  const canSubmit =
    !!videoFile && (modo !== "oculto" || !!ocultoFile) && !processing;

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

      {/* Mode selector */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 animate-fade-in delay-1">
        {(Object.keys(MODE_LABELS) as Modo[]).map((m) => {
          const meta = MODE_LABELS[m];
          const active = modo === m;
          return (
            <button
              key={m}
              onClick={() => {
                setModo(m);
                setOcultoFile(null);
                setDownloadUrl(null);
                setError(null);
                setProgress("");
              }}
              className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${
                active
                  ? "bg-gradient-to-r from-accent to-accent-hover text-white glow-accent shadow-lg"
                  : "glass-card text-muted hover:border-accent/50 hover:text-foreground"
              }`}
            >
              <div className="flex items-center gap-2">
                <Music size={18} />
                <span>{meta.title}</span>
              </div>
              <p className={`text-[11px] mt-1 ${active ? "text-white/80" : "text-muted"}`}>
                {meta.subtitle}
              </p>
            </button>
          );
        })}
      </div>

      {/* Upload sections */}
      <div className="space-y-6 animate-fade-in-up delay-2">
        <DropZone
          label="Vídeo MP4"
          accept="video/mp4,video/quicktime,video/x-matroska,video/webm"
          file={videoFile}
          onFile={setVideoFile}
          icon={<Upload size={40} className="text-muted" />}
        />

        {modo === "oculto" && (
          <DropZone
            label="MP3 oculto (ou MP4 — extraímos o áudio)"
            sublabel="A IA vai transcrever esse áudio em vez da voz original."
            accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg,audio/flac,audio/mp4,video/mp4,video/quicktime,video/x-matroska,video/webm"
            file={ocultoFile}
            onFile={setOcultoFile}
            icon={<Music size={40} className="text-muted" />}
          />
        )}

        {/* Slider Volume MP3 oculto */}
        {modo === "oculto" && (
          <div className="glass-card rounded-xl p-5 space-y-3">
            <div className="flex items-center gap-3">
              <Volume2 size={18} className="text-accent" />
              <span className="text-sm font-semibold text-foreground">
                Volume do MP3 oculto
              </span>
              <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-accent-soft text-accent">
                {(ocultoVolume * 1000).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min={0.0005}
              max={0.1}
              step={0.0005}
              value={ocultoVolume}
              onChange={(e) => setOcultoVolume(parseFloat(e.target.value))}
              className="w-full accent-accent"
            />
            <div className="text-[11px] text-muted space-y-2 leading-relaxed">
              <p>
                Abaixo de <strong>5%</strong>, a IA pode não conseguir detectar a copy oculta.
                Valor recomendado: <strong>5%</strong>.
              </p>
              <p className="pt-2 border-t border-border/40">
                <strong className="text-foreground/80">Por que usar áudio oculto?</strong> A IA das plataformas (Facebook, TikTok, Instagram, etc.) usa o áudio do criativo
                pra entender o assunto e direcionar pro público certo. Se você esconde o áudio original (uma copy &quot;black&quot;) mas insere uma
                <strong> copy &quot;white&quot;</strong> relevante apenas pra IA escutar, ela classifica o anúncio pelo conteúdo white — então ela
                continua entregando pro público certo, sem ficar &quot;cega&quot;.
              </p>
              <p>
                <strong className="text-foreground/80">Exemplo:</strong> criativo de emagrecimento no Facebook com copy black que a IA não consegue
                transcrever + um MP3 oculto com uma copy white sobre emagrecimento. A IA escuta só a copy white, classifica o anúncio como sendo de
                emagrecimento e direciona pra pessoas interessadas no tema.
              </p>
            </div>
          </div>
        )}

        {/* Start time */}
        <div className="glass-card rounded-xl p-5 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={startEnabled}
              onChange={(e) => setStartEnabled(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <Clock size={18} className="text-accent" />
            <span className="text-sm font-semibold text-foreground">
              Camuflar só a partir de um momento
            </span>
            {startEnabled && (
              <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-accent-soft text-accent">
                {fmtMmss(startSec)}
              </span>
            )}
          </label>
          {startEnabled && (
            <>
              <input
                type="range"
                min={0}
                max={Math.max(0.1, duration - 0.1)}
                step={0.05}
                value={startSec}
                onChange={(e) => setStartSec(parseFloat(e.target.value))}
                className="w-full accent-accent"
                disabled={!duration}
              />
              <p className="text-[11px] text-muted">
                Antes do ponto: voz original (transcrevível). Depois do ponto: voz camuflada.
                {duration > 0 && (
                  <> Duração detectada: <strong>{fmtMmss(duration)}</strong>.</>
                )}
              </p>
            </>
          )}
        </div>

        {/* Saída — metadados + compressão */}
        <div className="glass-card rounded-xl p-5 space-y-4">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={cleanMetadata}
              onChange={(e) => setCleanMetadata(e.target.checked)}
              className="w-4 h-4 accent-accent"
            />
            <ShieldOff size={18} className="text-accent" />
            <span className="text-sm font-semibold text-foreground">
              Limpar metadados do vídeo
            </span>
          </label>
          <p className="text-[11px] text-muted leading-relaxed pl-7">
            Remove título, autor, encoder, data de criação, handler e vendor — o vídeo sai
            sem rastros de origem.
          </p>

          <div className="pt-3 border-t border-border/40 space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={compressEnabled}
                onChange={(e) => setCompressEnabled(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <Minimize2 size={18} className="text-accent" />
              <span className="text-sm font-semibold text-foreground">
                Comprimir vídeo
              </span>
              {compressEnabled && (
                <span className="ml-auto text-xs font-bold px-2.5 py-1 rounded-full bg-accent-soft text-accent">
                  {compressPct.toFixed(0)}%
                  {videoFile && (
                    <> · ~{((videoFile.size / 1024 / 1024) * compressPct / 100).toFixed(1)} MB</>
                  )}
                </span>
              )}
            </label>
            {compressEnabled && (
              <>
                <input
                  type="range"
                  min={10}
                  max={100}
                  step={1}
                  value={compressPct}
                  onChange={(e) => setCompressPct(parseFloat(e.target.value))}
                  className="w-full accent-accent"
                />
                <p className="text-[11px] text-muted leading-relaxed">
                  {videoFile ? (
                    <>
                      Original: <strong>{(videoFile.size / 1024 / 1024).toFixed(1)} MB</strong> →
                      saída estimada: <strong>~{((videoFile.size / 1024 / 1024) * compressPct / 100).toFixed(1)} MB</strong>.
                      {" "}<strong>30%</strong> é um bom equilíbrio; abaixo de <strong>20%</strong> começam artefatos visuais.
                    </>
                  ) : (
                    <>Selecione um vídeo pra ver a estimativa de tamanho. <strong>30%</strong> é um bom equilíbrio entre tamanho e qualidade.</>
                  )}
                </p>
              </>
            )}
          </div>
        </div>

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
            disabled={!canSubmit}
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
              download={`${(videoFile?.name?.replace(/\.[^.]+$/, "") || "video")}_hiddencopy.mp4`}
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
