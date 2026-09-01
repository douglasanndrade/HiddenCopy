import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { rename, stat, unlink } from "fs/promises";
import { join } from "path";
import { Readable } from "stream";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { autenticar, cobrarCredito } from "@/lib/api-auth";
import {
  TEMP_DIR,
  caminhoParcial,
  extensaoSegura,
  garantirTempDir,
} from "@/lib/uploads-parciais";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const SCRIPTS_DIR = join(process.cwd(), "..");
// Em producao (Docker) usa "python"; local Windows pode setar PYTHON_BIN=py no .env.local
const PYTHON_BIN = process.env.PYTHON_BIN || "python";

type Modo = "suave" | "oculto" | "clean";

type Corpo = {
  videoUploadId?: string;
  ocultoUploadId?: string;
  videoNome?: string;
  ocultoNome?: string;
  modo?: Modo;
  oculto_volume?: number;
  start_sec?: number;
  clean_metadata?: boolean;
  compress?: boolean;
  compress_pct?: number;
};

/**
 * Processa um video que ja subiu em partes por /api/uploads. Aqui nao chega
 * mais arquivo nenhum -- so o id do upload -- entao esta requisicao e curta e
 * leve, e nenhum proxy no caminho precisa aguentar 300MB de corpo.
 */
export async function POST(req: NextRequest) {
  const paraLimpar: string[] = [];
  const limpar = async () => {
    await Promise.all(paraLimpar.map((caminho) => unlink(caminho).catch(() => {})));
  };

  try {
    const auth = await autenticar(req);
    if (!auth.ok) return auth.resposta;

    await garantirTempDir();

    let corpo: Corpo;
    try {
      corpo = await req.json();
    } catch {
      return NextResponse.json({ error: "Envio inválido" }, { status: 400 });
    }

    const modo = corpo.modo || "suave";
    if (!["suave", "oculto", "clean"].includes(modo)) {
      return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
    }

    const parcialVideo = corpo.videoUploadId ? caminhoParcial(corpo.videoUploadId) : null;
    const parcialOculto = corpo.ocultoUploadId ? caminhoParcial(corpo.ocultoUploadId) : null;

    if (parcialVideo) paraLimpar.push(parcialVideo);
    if (parcialOculto) paraLimpar.push(parcialOculto);

    if (!parcialVideo) {
      await limpar();
      return NextResponse.json({ error: "Nenhum vídeo enviado" }, { status: 400 });
    }
    if (modo === "oculto" && !parcialOculto) {
      await limpar();
      return NextResponse.json({ error: "Modo MP3 oculto requer arquivo oculto" }, { status: 400 });
    }

    const id = randomUUID();

    // Renomeia com a extensao certa: o ffmpeg se vira pelo conteudo, mas um
    // arquivo ".parcial" e pedir problema com container que depende do nome.
    const videoPath = join(TEMP_DIR, `${id}_input${extensaoSegura(corpo.videoNome, ".mp4")}`);
    try {
      await rename(parcialVideo, videoPath);
    } catch {
      await limpar();
      return NextResponse.json(
        { error: "Envio não encontrado. Tente enviar o vídeo de novo" },
        { status: 404 }
      );
    }
    paraLimpar.push(videoPath);

    let ocultoPath: string | null = null;
    if (parcialOculto) {
      ocultoPath = join(TEMP_DIR, `${id}_oculto${extensaoSegura(corpo.ocultoNome, ".mp3")}`);
      try {
        await rename(parcialOculto, ocultoPath);
        paraLimpar.push(ocultoPath);
      } catch {
        await limpar();
        return NextResponse.json(
          { error: "Envio do áudio oculto não encontrado. Tente de novo" },
          { status: 404 }
        );
      }
    }

    const ocultoVolume = Math.max(0.0005, Math.min(0.1, Number(corpo.oculto_volume) || 0.005));
    const startSec = Math.max(0, Number(corpo.start_sec) || 0);
    const cleanMetadata = corpo.clean_metadata !== false;
    const compress = corpo.compress === true;
    const compressPct = Math.max(10, Math.min(100, Number(corpo.compress_pct) || 30));

    const outputPath = join(TEMP_DIR, `${id}_output.mp4`);
    paraLimpar.push(outputPath);

    const config = {
      input: videoPath,
      output: outputPath,
      mode: modo,
      oculto: ocultoPath,
      oculto_volume: ocultoVolume,
      start_sec: startSec,
      clean_metadata: cleanMetadata,
      compress: compress,
      compress_pct: compressPct,
    };

    try {
      const scriptPath = join(SCRIPTS_DIR, "cloaker.py");
      const { stdout, stderr } = await execFileAsync(
        PYTHON_BIN,
        [scriptPath, JSON.stringify(config)],
        { timeout: 600000, maxBuffer: 50 * 1024 * 1024 }
      );
      if (stderr) console.log("[cloaker stderr]", stderr);
      console.log("[cloaker stdout]", stdout);

      await cobrarCredito(auth.usuario, modo);

      // Entradas ja cumpriram o papel; saem do disco antes do download comecar.
      await unlink(videoPath).catch(() => {});
      if (ocultoPath) await unlink(ocultoPath).catch(() => {});

      const { size } = await stat(outputPath);
      const arquivo = createReadStream(outputPath);
      // Resposta por stream: readFile() traria o video inteiro pra RAM.
      // 'close' cobre o download completo e tambem o cliente desistindo no
      // meio -- nos dois casos o arquivo sai do disco.
      const removerSaida = () => void unlink(outputPath).catch(() => {});
      arquivo.on("close", removerSaida);
      arquivo.on("error", removerSaida);

      return new NextResponse(Readable.toWeb(arquivo) as unknown as ReadableStream<Uint8Array>, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Length": String(size),
          "Content-Disposition": `attachment; filename="hiddencopy_${modo}_${id}.mp4"`,
        },
      });
    } catch (err) {
      await limpar();
      const message = err instanceof Error ? err.message : "Erro no processamento";
      console.error("Process error:", err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    await limpar();
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
