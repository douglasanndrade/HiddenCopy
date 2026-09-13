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
  Square,
  Hourglass,
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

const ACCEPT_VIDEO = "video/mp4,video/quicktime,video/x-matroska,video/webm";

function formatSize(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`;
}

function nomeSaida(file: File) {
  return `${file.name.replace(/\.[^.]+$/, "") || "video"}_hiddencopy.mp4`;
}

/* ─── Fila ─── */

type StatusItem = "fila" | "enviando" | "processando" | "ok" | "erro" | "cancelado";

type ItemFila = {
  chave: string;
  file: File;
  status: StatusItem;
  percent: number;
  etapa: string;
  erro?: string;
  /** Resultado guardado no servidor: baixa sob demanda, sem ocupar RAM. */
  historicoId?: string;
  /** Sem historico (ex.: modo dev), o video fica em memoria. */
  blobUrl?: string;
  baixado?: boolean;
};

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

/* ─── Varios videos de uma vez ─── */

function VideosDropZone({
  files,
  onAdd,
  onRemove,
  disabled,
}: {
  files: File[];
  onAdd: (novos: File[]) => void;
  onRemove: (index: number) => void;
  disabled: boolean;
}) {
  const [dragOver, setDragOver] = useState(false);
  const total = files.reduce((soma, f) => soma + f.size, 0);

  return (
    <div className="space-y-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (disabled) return;
          onAdd(Array.from(e.dataTransfer.files).filter((f) => f.type.startsWith("video/")));
        }}
        className={`relative glass-card border-2 border-dashed rounded-xl p-6 sm:p-10 text-center transition-all duration-300 ${
          disabled ? "opacity-50" : "cursor-pointer"
        } ${
          dragOver
            ? "animate-border-glow bg-accent-soft border-accent"
            : files.length
            ? "border-success/50 glow-success"
            : "border-border hover:border-accent/40"
        }`}
      >
        <input
          type="file"
          accept={ACCEPT_VIDEO}
          multiple
          disabled={disabled}
          onChange={(e) => {
            onAdd(Array.from(e.target.files || []));
            // Permite escolher o mesmo arquivo de novo depois de remover.
            e.target.value = "";
          }}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center gap-4 text-muted">
          <div className="animate-float">
            <Upload size={40} className="text-muted" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground/80">
              {files.length ? "Adicionar mais vídeos" : "Vídeos MP4"}
            </p>
            <p className="text-xs mt-1 text-muted">
              Arraste ou clique — pode selecionar vários de uma vez
            </p>
          </div>
        </div>
      </div>

      {files.length > 0 && (
        <div className="glass-card rounded-xl p-3 space-y-1">
          <div className="flex items-center justify-between px-2 pb-2 text-xs text-muted">
            <span>
              <strong className="text-foreground">{files.length}</strong>{" "}
              {files.length === 1 ? "vídeo selecionado" : "vídeos selecionados"}
            </span>
            <span>{formatSize(total)}</span>
          </div>
          <div className="max-h-64 overflow-y-auto space-y-1">
            {files.map((f, i) => (
              <div
                key={`${f.name}-${f.size}-${f.lastModified}`}
                className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-card"
              >
                <FileVideo size={16} className="text-success shrink-0" />
                <span className="text-sm text-foreground truncate min-w-0 flex-1">{f.name}</span>
                <span className="text-[11px] text-muted shrink-0">{formatSize(f.size)}</span>
                <button
                  onClick={() => onRemove(i)}
                  disabled={disabled}
                  className="p-1 rounded-md hover:bg-red-500/15 group disabled:opacity-40"
                >
                  <X size={14} className="text-muted group-hover:text-red-400" />
                </button>
              </div>
            ))}
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
  const [videoFiles, setVideoFiles] = useState<File[]>([]);
  const [ocultoFile, setOcultoFile] = useState<File | null>(null);
  const [ocultoVolume, setOcultoVolume] = useState(0.005);
  const [startEnabled, setStartEnabled] = useState(false);
  const [startSec, setStartSec] = useState(0);
  const [cleanMetadata, setCleanMetadata] = useState(true);
  const [compressEnabled, setCompressEnabled] = useState(false);
  const [compressPct, setCompressPct] = useState(30);
  const [processing, setProcessing] = useState(false);
  const [parando, setParando] = useState(false);
  const [fila, setFila] = useState<ItemFila[]>([]);
  const [baixando, setBaixando] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const pararRef = useRef(false);
  // Uma fila de 30 videos pode passar de uma hora; o Supabase renova o token
  // no meio do caminho, entao cada item le o mais recente daqui.
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const filaRef = useRef(fila);
  filaRef.current = fila;

  const unicoVideo = videoFiles.length === 1 ? videoFiles[0] : null;
  const duration = useVideoDuration(unicoVideo);
  const totalBytes = videoFiles.reduce((soma, f) => soma + f.size, 0);

  // Limpar intervalo e videos em memoria ao desmontar
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
      filaRef.current.forEach((i) => i.blobUrl && URL.revokeObjectURL(i.blobUrl));
    };
  }, []);

  // Sair da pagina no meio mata a fila; pelo menos avisa antes.
  useEffect(() => {
    if (!processing) return;
    const avisar = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", avisar);
    return () => window.removeEventListener("beforeunload", avisar);
  }, [processing]);

  // Reset start time ao trocar de vídeo
  useEffect(() => {
    setStartSec(0);
  }, [unicoVideo]);

  const atualizar = (chave: string, patch: Partial<ItemFila>) => {
    setFila((atual) => atual.map((i) => (i.chave === chave ? { ...i, ...patch } : i)));
  };

  const adicionarVideos = (novos: File[]) => {
    setVideoFiles((atual) => {
      const vistos = new Set(atual.map((f) => `${f.name}-${f.size}-${f.lastModified}`));
      return [...atual, ...novos.filter((f) => !vistos.has(`${f.name}-${f.size}-${f.lastModified}`))];
    });
  };

  // Roda so na fase de processamento, de `inicio` ate 95%. O envio tem
  // progresso de verdade; daqui pra frente o servidor nao tem como reportar
  // andamento, entao continua estimado.
  const startProgressSimulation = (chave: string, fileSizeMB: number, inicio: number) => {
    const estimatedSeconds = Math.max(10, Math.min(fileSizeMB * 0.8, 180));
    const faixa = Math.max(1, 95 - inicio);
    const stepDuration = (estimatedSeconds * 1000) / faixa;
    let currentPercent = inicio;

    atualizar(chave, { percent: inicio, etapa: progressSteps[0].label });

    progressInterval.current = setInterval(() => {
      currentPercent += 1;

      if (currentPercent >= 95) {
        if (progressInterval.current) clearInterval(progressInterval.current);
        return;
      }

      // Os rotulos foram escritos numa escala 0-100, mas a barra percorre so
      // de `inicio` a 95 -- por isso o rotulo sai da fracao dessa faixa.
      const fracao = ((currentPercent - inicio) / faixa) * 100;
      const step = [...progressSteps].reverse().find((s) => fracao >= s.at);
      atualizar(chave, { percent: currentPercent, ...(step ? { etapa: step.label } : {}) });
    }, stepDuration);
  };

  const stopProgressSimulation = () => {
    if (progressInterval.current) {
      clearInterval(progressInterval.current);
      progressInterval.current = null;
    }
  };

  const handleProcess = async () => {
    if (!videoFiles.length) return;
    if (modo === "oculto" && !ocultoFile) return;
    if (!sessionRef.current) return;

    if (credits < videoFiles.length) {
      setError(
        videoFiles.length === 1
          ? "Créditos insuficientes. Adquira mais créditos."
          : `Você tem ${credits} crédito(s) e selecionou ${videoFiles.length} vídeos. Remova alguns ou adquira mais créditos.`
      );
      return;
    }

    fila.forEach((i) => i.blobUrl && URL.revokeObjectURL(i.blobUrl));
    const itens: ItemFila[] = videoFiles.map((file) => ({
      chave: crypto.randomUUID(),
      file,
      status: "fila",
      percent: 0,
      etapa: "Na fila",
    }));

    setFila(itens);
    setVideoFiles([]);
    setProcessing(true);
    setError(null);
    pararRef.current = false;
    setParando(false);

    // Configuracao congelada no clique: mexer nos controles durante a fila nao
    // pode fazer metade dos videos sair diferente.
    const opcoes = {
      modo,
      oculto_volume: ocultoVolume,
      start_sec: itens.length === 1 && startEnabled ? startSec : 0,
      clean_metadata: cleanMetadata,
      compress: compressEnabled,
      compress_pct: compressPct,
    };

    let ocultoUploadId: string | undefined;

    try {
      // O audio sobe uma vez so e o servidor copia pra cada video.
      if (modo === "oculto" && ocultoFile) {
        atualizar(itens[0].chave, { status: "enviando", etapa: "Enviando áudio oculto..." });
        try {
          ocultoUploadId = await enviarEmPartes(ocultoFile, sessionRef.current.access_token, () => {});
        } catch (err) {
          const msg = traduzirErro(err);
          setError(`Falha ao enviar o áudio oculto: ${msg}`);
          setFila((atual) =>
            atual.map((i) => ({ ...i, status: "erro", etapa: "", erro: "Não processado" }))
          );
          return;
        }
      }

      for (let idx = 0; idx < itens.length; idx++) {
        const item = itens[idx];

        if (pararRef.current) {
          setFila((atual) =>
            atual.map((i, j) => (j >= idx ? { ...i, status: "cancelado", etapa: "", percent: 0 } : i))
          );
          break;
        }

        const token = sessionRef.current?.access_token;
        if (!token) {
          setError("Sessão expirada. Faça login novamente");
          setFila((atual) =>
            atual.map((i, j) => (j >= idx ? { ...i, status: "erro", etapa: "", erro: "Não processado" } : i))
          );
          break;
        }

        try {
          atualizar(item.chave, { status: "enviando", etapa: "Enviando vídeo...", percent: 0 });
          const videoUploadId = await enviarEmPartes(item.file, token, (bytes) => {
            atualizar(item.chave, {
              percent: Math.min(Math.round((bytes / item.file.size) * FIM_ENVIO), FIM_ENVIO),
            });
          });

          atualizar(item.chave, { status: "processando" });
          startProgressSimulation(item.chave, item.file.size / 1024 / 1024, FIM_ENVIO);

          const res = await fetch("/api/process", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              videoUploadId,
              ocultoUploadId,
              manterOculto: !!ocultoUploadId,
              videoNome: item.file.name,
              ocultoNome: ocultoFile?.name,
              ...opcoes,
            }),
          });

          if (!res.ok) {
            throw new Error(await readError(res, "Erro ao processar. Tente novamente"));
          }

          stopProgressSimulation();

          const historicoId = res.headers.get("X-Historico-Id");
          if (historicoId) {
            // Ja esta guardado no servidor: nao baixa agora, so quando clicar.
            await res.body?.cancel().catch(() => {});
            atualizar(item.chave, { status: "ok", percent: 100, etapa: "Concluído", historicoId });
          } else {
            const blob = await res.blob();
            atualizar(item.chave, {
              status: "ok",
              percent: 100,
              etapa: "Concluído",
              blobUrl: URL.createObjectURL(blob),
            });
          }

          await refreshCredits();
        } catch (err) {
          stopProgressSimulation();
          const msg = traduzirErro(err);
          atualizar(item.chave, { status: "erro", etapa: "", erro: msg, percent: 0 });

          // Esses nao vao melhorar no proximo video; o resto da fila para.
          if (msg.startsWith("Créditos insuficientes") || msg.startsWith("Sessão expirada")) {
            setError(msg);
            setFila((atual) =>
              atual.map((i, j) =>
                j > idx ? { ...i, status: "erro", etapa: "", erro: "Não processado" } : i
              )
            );
            break;
          }
        }
      }
    } finally {
      stopProgressSimulation();
      if (ocultoUploadId) {
        void fetch(`/api/uploads/${ocultoUploadId}`, { method: "DELETE" }).catch(() => {});
      }
      setProcessing(false);
      setParando(false);
    }
  };

  const baixar = async (item: ItemFila) => {
    if (item.blobUrl) {
      const a = document.createElement("a");
      a.href = item.blobUrl;
      a.download = nomeSaida(item.file);
      a.click();
      atualizar(item.chave, { baixado: true });
      return;
    }
    if (!item.historicoId || !session) return;

    setBaixando(item.chave);
    try {
      const res = await fetch(`/api/historico/${item.historicoId}`, {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) throw new Error(await readError(res, "Falha ao baixar"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = nomeSaida(item.file);
      a.click();
      URL.revokeObjectURL(url);
      atualizar(item.chave, { baixado: true });
    } catch (err) {
      setError(traduzirErro(err));
    } finally {
      setBaixando(null);
    }
  };

  const concluidos = fila.filter((i) => i.status === "ok").length;
  const comErro = fila.filter((i) => i.status === "erro").length;
  const temResultadoEmMemoria = fila.some((i) => i.status === "ok" && i.blobUrl);
  const canSubmit =
    videoFiles.length > 0 && (modo !== "oculto" || !!ocultoFile) && !processing;

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
              disabled={processing}
              onClick={() => {
                setModo(m);
                setOcultoFile(null);
                setError(null);
              }}
              className={`text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 disabled:cursor-not-allowed ${
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
        <VideosDropZone
          files={videoFiles}
          onAdd={adicionarVideos}
          onRemove={(index) => setVideoFiles((atual) => atual.filter((_, i) => i !== index))}
          disabled={processing}
        />

        {modo === "oculto" && (
          <DropZone
            label="MP3 oculto (ou MP4 — extraímos o áudio)"
            sublabel="A IA vai transcrever esse áudio em vez da voz original. O mesmo áudio vale pra todos os vídeos."
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

        {/* Start time — depende da duracao de UM video, entao so vale sem lote */}
        {videoFiles.length <= 1 && (
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
        )}

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
                  {totalBytes > 0 && (
                    <> · ~{((totalBytes / 1024 / 1024) * compressPct / 100).toFixed(1)} MB</>
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
                  {totalBytes > 0 ? (
                    <>
                      Original: <strong>{(totalBytes / 1024 / 1024).toFixed(1)} MB</strong> →
                      saída estimada: <strong>~{((totalBytes / 1024 / 1024) * compressPct / 100).toFixed(1)} MB</strong>.
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
            {processing
              ? "Processando..."
              : videoFiles.length > 1
              ? `Processar ${videoFiles.length} vídeos`
              : "Processar"}
          </button>

          {processing && fila.length > 1 && (
            <button
              onClick={() => {
                pararRef.current = true;
                setParando(true);
              }}
              disabled={parando}
              className="flex items-center justify-center gap-2.5 px-6 py-3.5 glass-card rounded-xl font-semibold text-sm text-muted hover:text-red-400 transition-all disabled:opacity-50"
            >
              <Square size={16} />
              {parando ? "Parando após o vídeo atual..." : "Parar fila"}
            </button>
          )}
        </div>

        {/* Fila / resultados */}
        {fila.length > 0 && (
          <div className="glass-card rounded-xl p-4 sm:p-5 space-y-3 animate-fade-in-up">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold text-foreground">Resultados</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-success/10 text-success">
                {concluidos}/{fila.length} prontos
              </span>
              {comErro > 0 && (
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-red-500/10 text-red-400">
                  {comErro} com erro
                </span>
              )}
            </div>

            <div className="space-y-2">
              {fila.map((item, idx) => {
                const ativo = item.status === "enviando" || item.status === "processando";
                return (
                  <div
                    key={item.chave}
                    className={`rounded-lg border px-3 py-2.5 transition-all ${
                      ativo
                        ? "border-accent/60 bg-accent-soft/40"
                        : item.status === "ok"
                        ? "border-success/30"
                        : item.status === "erro"
                        ? "border-red-500/30"
                        : "border-border/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] text-muted w-5 text-right shrink-0">{idx + 1}</span>
                      <div className="shrink-0">
                        {item.status === "ok" ? (
                          <CheckCircle size={18} className="text-success" />
                        ) : item.status === "erro" ? (
                          <AlertTriangle size={18} className="text-red-400" />
                        ) : ativo ? (
                          <Loader2 size={18} className="text-accent animate-spin" />
                        ) : item.status === "cancelado" ? (
                          <X size={18} className="text-muted" />
                        ) : (
                          <Hourglass size={18} className="text-muted" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground truncate">{item.file.name}</p>
                        <p
                          className={`text-[11px] truncate ${
                            item.status === "erro" ? "text-red-400" : "text-muted"
                          }`}
                        >
                          {item.status === "erro"
                            ? item.erro
                            : item.status === "cancelado"
                            ? "Cancelado"
                            : item.status === "ok"
                            ? item.baixado
                              ? "Baixado"
                              : "Pronto para baixar"
                            : item.etapa}
                        </p>
                      </div>

                      {ativo && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-accent-soft text-accent shrink-0">
                          {item.percent}%
                        </span>
                      )}

                      {item.status === "ok" && (
                        <button
                          onClick={() => baixar(item)}
                          disabled={baixando === item.chave}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 transition-all disabled:opacity-60 ${
                            item.baixado
                              ? "glass-card text-success"
                              : "bg-gradient-to-r from-green-600 to-emerald-500 text-white hover:opacity-90"
                          }`}
                        >
                          {baixando === item.chave ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Download size={14} />
                          )}
                          {item.baixado ? "Baixar de novo" : "Baixar"}
                        </button>
                      )}
                    </div>

                    {ativo && (
                      <div className="mt-2 w-full bg-background rounded-full h-1.5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover transition-all duration-500 ease-out"
                          style={{ width: `${item.percent}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {concluidos > 0 && !temResultadoEmMemoria && (
              <p className="text-[11px] text-muted pt-1">
                Os vídeos prontos também ficam salvos no Histórico.
              </p>
            )}
          </div>
        )}

        {/* Warning box — so quando o resultado existe apenas nesta aba */}
        {temResultadoEmMemoria && (
          <div className="glass-card rounded-xl p-5 flex items-start gap-4 border-l-2 border-yellow-500/70 animate-fade-in-up delay-4">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-yellow-500/10 shrink-0">
              <AlertTriangle
                size={20}
                className="text-yellow-500 animate-pulse-glow"
              />
            </div>
            <div>
              <p className="text-sm font-semibold text-yellow-400">
                Baixe seus vídeos agora!
              </p>
              <p className="text-xs text-muted mt-1.5 leading-relaxed">
                Nenhuma mídia fica salva em nossos servidores. Após sair desta
                página, os arquivos não estarão mais disponíveis.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
