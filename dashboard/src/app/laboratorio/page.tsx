"use client";

import { useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { Upload, Music, Merge, Download, Loader2, CheckCircle, X } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Modo = "melhorar" | "mesclar";

export default function Laboratorio() {
  const searchParams = useSearchParams();
  const { session, credits, refreshCredits } = useAuth();
  const initialMode = (searchParams.get("modo") as Modo) || "melhorar";

  const [modo, setModo] = useState<Modo>(initialMode);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [musicFile, setMusicFile] = useState<File | null>(null);
  const [musicVolume, setMusicVolume] = useState(-10);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState("");
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!videoFile) return;
    if (modo === "mesclar" && !musicFile) return;
    if (!session) return;

    if (credits < 1) {
      setError("Créditos insuficientes. Adquira mais créditos.");
      return;
    }

    setProcessing(true);
    setProgress("Enviando arquivos...");
    setError(null);
    setDownloadUrl(null);

    try {
      const formData = new FormData();
      formData.append("video", videoFile);
      formData.append("modo", modo);
      if (modo === "mesclar" && musicFile) {
        formData.append("music", musicFile);
        formData.append("volume", musicVolume.toString());
      }

      setProgress("Processando áudio...");

      const res = await fetch("/api/process", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Erro ao processar");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setDownloadUrl(url);
      setProgress("Concluído!");
      await refreshCredits();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido");
      setProgress("");
    } finally {
      setProcessing(false);
    }
  };

  const resetForm = () => {
    setVideoFile(null);
    setMusicFile(null);
    setDownloadUrl(null);
    setError(null);
    setProgress("");
  };

  return (
    <div className="p-8 max-w-3xl">
      <h1 className="text-3xl font-bold mb-2">Laboratório</h1>
      <p className="text-muted mb-8">
        Camufle o áudio do seu vídeo de forma discreta e profissional.
      </p>

      {/* Seletor de modo */}
      <div className="flex gap-3 mb-8">
        <button
          onClick={() => { setModo("melhorar"); resetForm(); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all ${
            modo === "melhorar"
              ? "bg-accent text-white"
              : "bg-card border border-border text-muted hover:text-foreground"
          }`}
        >
          <Music size={18} />
          Camuflar Video
        </button>
        <button
          onClick={() => { setModo("mesclar"); resetForm(); }}
          className={`flex items-center gap-2 px-5 py-3 rounded-lg text-sm font-medium transition-all ${
            modo === "mesclar"
              ? "bg-accent text-white"
              : "bg-card border border-border text-muted hover:text-foreground"
          }`}
        >
          <Merge size={18} />
          Mesclar Video + Música
        </button>
      </div>

      {/* Upload de vídeo */}
      <div className="space-y-6">
        <DropZone
          label="Vídeo MP4"
          accept="video/mp4"
          file={videoFile}
          onFile={setVideoFile}
          icon={<Upload size={32} />}
        />

        {modo === "mesclar" && (
          <>
            <DropZone
              label="Música MP3"
              accept="audio/mpeg"
              file={musicFile}
              onFile={setMusicFile}
              icon={<Music size={32} />}
            />

            <div className="bg-card border border-border rounded-xl p-5">
              <label className="text-sm font-medium mb-3 block">
                Volume da música: {musicVolume} dB
              </label>
              <input
                type="range"
                min={-20}
                max={-3}
                value={musicVolume}
                onChange={(e) => setMusicVolume(Number(e.target.value))}
                className="w-full accent-accent"
              />
              <div className="flex justify-between text-xs text-muted mt-1">
                <span>Bem baixa (-20)</span>
                <span>Média (-10)</span>
                <span>Alta (-3)</span>
              </div>
            </div>
          </>
        )}

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
            <X size={20} className="text-red-500" />
            <span className="text-red-400 text-sm">{error}</span>
          </div>
        )}

        {progress && !error && (
          <div className="bg-accent-soft border border-accent/20 rounded-xl p-4 flex items-center gap-3">
            {downloadUrl ? (
              <CheckCircle size={20} className="text-success" />
            ) : (
              <Loader2 size={20} className="text-accent animate-spin" />
            )}
            <span className="text-sm">{progress}</span>
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={handleProcess}
            disabled={processing || !videoFile || (modo === "mesclar" && !musicFile)}
            className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-lg font-medium text-sm hover:bg-accent-hover transition-all disabled:opacity-40 disabled:cursor-not-allowed"
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
              download={`hiddencopy_${modo}_${Date.now()}.mp4`}
              className="flex items-center gap-2 px-6 py-3 bg-success text-white rounded-lg font-medium text-sm hover:opacity-90 transition-all"
            >
              <Download size={18} />
              Baixar Resultado
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function DropZone({
  label,
  accept,
  file,
  onFile,
  icon,
}: {
  label: string;
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
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      className={`relative bg-card border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
        dragOver
          ? "border-accent bg-accent-soft"
          : file
          ? "border-success/50"
          : "border-border hover:border-muted"
      }`}
    >
      <input
        type="file"
        accept={accept}
        onChange={(e) => onFile(e.target.files?.[0] || null)}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      />

      {file ? (
        <div className="flex items-center justify-center gap-3">
          <CheckCircle size={24} className="text-success" />
          <div className="text-left">
            <p className="text-sm font-medium">{file.name}</p>
            <p className="text-xs text-muted">
              {(file.size / 1024 / 1024).toFixed(1)} MB
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onFile(null); }}
            className="ml-4 p-1 hover:bg-card-hover rounded"
          >
            <X size={16} className="text-muted" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 text-muted">
          {icon}
          <div>
            <p className="text-sm font-medium">{label}</p>
            <p className="text-xs">Arraste ou clique para selecionar</p>
          </div>
        </div>
      )}
    </div>
  );
}
