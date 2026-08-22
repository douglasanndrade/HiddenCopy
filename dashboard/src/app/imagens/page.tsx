"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Download,
  Loader2,
  CheckCircle,
  X,
  AlertTriangle,
  ImageIcon,
  ImagePlus,
  Sparkles,
  Activity,
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
  "Request Entity Too Large": "Imagem muito grande. Tente uma menor",
  "Payload Too Large": "Imagem muito grande. Tente uma menor",
};

function traduzirErro(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  for (const [en, pt] of Object.entries(errosMap)) {
    if (msg.toLowerCase().includes(en.toLowerCase())) return pt;
  }
  return msg;
}

type Intensidade = "leve" | "medio" | "forte";

const INTENSIDADES: { id: Intensidade; title: string; subtitle: string }[] = [
  {
    id: "leve",
    title: "Leve",
    subtitle: "Alteração mínima. Para imagem que já tem textura própria.",
  },
  {
    id: "medio",
    title: "Médio",
    subtitle: "Padrão. Equilíbrio entre camuflagem e fidelidade visual.",
  },
  {
    id: "forte",
    title: "Forte",
    subtitle: "Camuflagem máxima. Grão perceptível em zoom.",
  },
];

const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_MB = 25;

const progressSteps = [
  { at: 0, label: "Enviando imagem..." },
  { at: 12, label: "Analisando espectro de frequência..." },
  { at: 28, label: "Normalizando textura..." },
  { at: 45, label: "Aplicando ruído de sensor..." },
  { at: 62, label: "Simulando captura de câmera..." },
  { at: 78, label: "Reescrevendo assinatura espectral..." },
  { at: 92, label: "Gravando metadados EXIF..." },
];

type Analise = {
  slope_antes?: number;
  slope_depois?: number;
  glcm_antes?: number;
  glcm_depois?: number;
  ruido_antes?: number;
  ruido_depois?: number;
  psnr?: number;
};

/* ─── DropZone ─── */

function DropZone({
  file,
  onFile,
  previewUrl,
}: {
  file: File | null;
  onFile: (f: File | null) => void;
  previewUrl: string | null;
}) {
  const [dragOver, setDragOver] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const dropped = e.dataTransfer.files[0];
      if (dropped) onFile(dropped);
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
        accept={ACCEPT}
        onChange={(e) => onFile(e.target.files?.[0] || null)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
      />

      {file ? (
        <div className="flex items-center justify-center gap-4">
          <div className="w-14 h-14 rounded-lg overflow-hidden bg-success/10 shrink-0 flex items-center justify-center">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <ImageIcon size={24} className="text-success" />
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
            <X size={16} className="text-muted group-hover:text-red-400 transition-colors" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-4 text-muted">
          <div className="animate-float">
            <ImagePlus size={40} className="text-accent/70" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/80">Imagem do criativo</p>
            <p className="text-xs mt-0.5 text-accent/70">JPG, PNG ou WEBP · até {MAX_MB}MB</p>
            <p className="text-xs mt-1 text-muted">Arraste ou clique para selecionar</p>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Página ─── */

export default function ImagensPage() {
  const { session, refreshCredits } = useAuth();

  const [imagem, setImagem] = useState<File | null>(null);
  const [intensidade, setIntensidade] = useState<Intensidade>("medio");
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [error, setError] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [analise, setAnalise] = useState<Analise | null>(null);

  const [inputPreview, setInputPreview] = useState<string | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // preview local da imagem de entrada
  useEffect(() => {
    if (!imagem) {
      setInputPreview(null);
      return;
    }
    const url = URL.createObjectURL(imagem);
    setInputPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [imagem]);

  // libera o blob do resultado ao trocar/desmontar
  useEffect(() => {
    return () => {
      if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    };
  }, [downloadUrl]);

  const stopProgress = useCallback(() => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }, []);

  useEffect(() => stopProgress, [stopProgress]);

  const trocarImagem = (f: File | null) => {
    setImagem(f);
    setError("");
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl("");
    setAnalise(null);
    setProgressPercent(0);
    setProgress("");
  };

  const handleProcess = async () => {
    if (!imagem) return;

    if (imagem.size > MAX_MB * 1024 * 1024) {
      setError(`Imagem muito grande. Máximo ${MAX_MB}MB`);
      return;
    }

    setError("");
    if (downloadUrl) URL.revokeObjectURL(downloadUrl);
    setDownloadUrl("");
    setAnalise(null);
    setProcessing(true);
    setProgressPercent(0);
    setProgress(progressSteps[0].label);

    // progresso estimado: o script nao reporta andamento em tempo real
    progressTimer.current = setInterval(() => {
      setProgressPercent((prev) => {
        const next = Math.min(prev + 1.5, 95);
        const step = [...progressSteps].reverse().find((s) => next >= s.at);
        if (step) setProgress(step.label);
        return next;
      });
    }, 220);

    try {
      const formData = new FormData();
      formData.append("imagem", imagem);
      formData.append("intensidade", intensidade);

      const headers: Record<string, string> = {};
      if (session?.access_token) {
        headers.Authorization = `Bearer ${session.access_token}`;
      }

      const res = await fetch("/api/process-image", {
        method: "POST",
        headers,
        body: formData,
      });

      if (!res.ok) {
        throw new Error(await readError(res, "Erro ao processar. Tente novamente"));
      }

      const header = res.headers.get("X-Analise");
      if (header) {
        try {
          setAnalise(JSON.parse(decodeURIComponent(header)));
        } catch {
          // metricas sao decorativas, nao quebram o fluxo
        }
      }

      stopProgress();
      setProgressPercent(100);
      setProgress("Concluído!");

      const blob = await res.blob();
      setDownloadUrl(URL.createObjectURL(blob));
      await refreshCredits();
    } catch (err) {
      stopProgress();
      setError(traduzirErro(err));
      setProgress("");
      setProgressPercent(0);
    } finally {
      setProcessing(false);
    }
  };

  const isComplete = progressPercent === 100 && !!downloadUrl;
  const canSubmit = !!imagem && !processing;
  const nomeSaida = `${(imagem?.name?.replace(/\.[^.]+$/, "") || "imagem")}_hiddencopy.jpg`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-8">
      {/* Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-bold text-gradient">Imagens</h1>
        <p className="text-muted mt-2 text-sm sm:text-base">
          Camufle a assinatura de imagem gerada por IA sem alterar o visual do criativo.
        </p>
      </div>

      <div className="space-y-6">
        {/* Upload */}
        <div className="animate-fade-in-up delay-1">
          <DropZone file={imagem} onFile={trocarImagem} previewUrl={inputPreview} />
        </div>

        {/* Intensidade */}
        <div className="glass-card rounded-xl p-5 space-y-3 animate-fade-in-up delay-2">
          <div className="flex items-center gap-2.5">
            <Sparkles size={18} className="text-accent" />
            <span className="text-sm font-semibold text-foreground">Intensidade</span>
          </div>
          <div className="grid gap-2.5 sm:grid-cols-3">
            {INTENSIDADES.map((opt) => {
              const active = intensidade === opt.id;
              return (
                <button
                  key={opt.id}
                  onClick={() => setIntensidade(opt.id)}
                  disabled={processing}
                  className={`text-left p-3.5 rounded-xl border transition-all duration-300 disabled:opacity-50 ${
                    active
                      ? "border-accent bg-accent-soft glow-accent"
                      : "border-border hover:border-accent/40"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      active ? "text-accent" : "text-foreground/80"
                    }`}
                  >
                    {opt.title}
                  </p>
                  <p className="text-[11px] text-muted mt-1 leading-relaxed">{opt.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Erro */}
        {error && (
          <div className="glass-card rounded-xl p-4 flex items-start gap-3 border-l-2 border-red-500 animate-fade-in-up">
            <AlertTriangle size={18} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Progresso */}
        {progress && (
          <div
            className={`glass-card rounded-xl p-5 space-y-3 animate-fade-in-up ${
              isComplete ? "border-l-2 border-success glow-success" : "border-l-2 border-accent"
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
              <span className="text-sm font-medium text-foreground">{progress}</span>
              {!isComplete && (
                <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full bg-accent-soft text-accent">
                  {Math.round(progressPercent)}%
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

        {/* Antes / depois */}
        {downloadUrl && inputPreview && (
          <div className="glass-card rounded-xl p-5 space-y-3 animate-fade-in-up delay-2">
            <span className="text-sm font-semibold text-foreground">Antes e depois</span>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Original", src: inputPreview },
                { label: "Camuflada", src: downloadUrl },
              ].map((it) => (
                <div key={it.label} className="space-y-1.5">
                  <p className="text-[11px] font-medium text-muted uppercase tracking-wide">
                    {it.label}
                  </p>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={it.src}
                    alt={it.label}
                    className="w-full rounded-lg border border-border"
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted">
              A diferença aparece só em zoom — é grão de sensor, não desfoque.
            </p>
          </div>
        )}

        {/* Métricas */}
        {analise && analise.slope_depois !== undefined && (
          <div className="glass-card rounded-xl p-5 space-y-3 animate-fade-in-up delay-3">
            <div className="flex items-center gap-2.5">
              <Activity size={18} className="text-accent" />
              <span className="text-sm font-semibold text-foreground">O que mudou</span>
            </div>
            <div className="grid gap-2.5 sm:grid-cols-3">
              {[
                {
                  label: "Slope espectral",
                  antes: analise.slope_antes,
                  depois: analise.slope_depois,
                  hint: "1.0 = foto real",
                  casas: 2,
                },
                {
                  label: "Textura (GLCM)",
                  antes: analise.glcm_antes,
                  depois: analise.glcm_depois,
                  hint: "quanto maior, menos liso",
                  casas: 2,
                },
                {
                  label: "Grão de sensor",
                  antes: analise.ruido_antes,
                  depois: analise.ruido_depois,
                  hint: "níveis de 0-255",
                  casas: 1,
                },
              ].map((m) => (
                <div key={m.label} className="p-3.5 rounded-xl border border-border">
                  <p className="text-[11px] text-muted">{m.label}</p>
                  <p className="text-sm font-semibold text-foreground mt-1.5 tabular-nums">
                    <span className="text-muted">{m.antes?.toFixed(m.casas)}</span>
                    <span className="text-accent mx-1.5">→</span>
                    <span className="text-accent">{m.depois?.toFixed(m.casas)}</span>
                  </p>
                  <p className="text-[10px] text-muted mt-1">{m.hint}</p>
                </div>
              ))}
            </div>
            {analise.psnr !== undefined && (
              <p className="text-[11px] text-muted">
                Fidelidade visual: <strong className="text-foreground/80">{analise.psnr.toFixed(1)} dB</strong> de
                PSNR — acima de 25 dB a diferença é imperceptível em tamanho real.
              </p>
            )}
          </div>
        )}

        {/* Ações */}
        <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up delay-3">
          <button
            onClick={handleProcess}
            disabled={!canSubmit}
            className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-accent to-accent-hover text-white rounded-xl font-semibold text-sm btn-glow hover:glow-accent transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            {processing ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ImageIcon size={18} />
            )}
            {processing ? "Processando..." : "Processar"}
          </button>

          {downloadUrl && (
            <a
              href={downloadUrl}
              download={nomeSaida}
              className="flex items-center justify-center gap-2.5 px-8 py-3.5 bg-gradient-to-r from-green-600 to-emerald-500 text-white rounded-xl font-semibold text-sm btn-glow glow-success hover:opacity-90 transition-all duration-300 animate-scale-in"
            >
              <Download size={18} />
              Baixar Resultado
            </a>
          )}
        </div>

        {/* Aviso */}
        {downloadUrl && (
          <div className="glass-card rounded-xl p-5 flex items-start gap-4 border-l-2 border-yellow-500/70 animate-fade-in-up delay-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-yellow-500/10 shrink-0">
              <AlertTriangle size={20} className="text-yellow-500 animate-pulse-glow" />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-400">Baixe sua imagem agora!</p>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Nenhuma mídia fica salva em nossos servidores. Após sair desta página, o arquivo
                não estará mais disponível.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
