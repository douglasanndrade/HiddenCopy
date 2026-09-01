import { NextRequest, NextResponse } from "next/server";
import { createReadStream } from "fs";
import { stat, unlink } from "fs/promises";
import { join } from "path";
import { Readable } from "stream";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";
import {
  TEMP_DIR,
  UploadError,
  garantirTempDir,
  receberMultipart,
  type UploadRecebido,
} from "@/lib/upload-stream";

export const runtime = "nodejs";

const execFileAsync = promisify(execFile);

const SCRIPTS_DIR = join(process.cwd(), "..");
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
// Em producao (Docker) usa "python"; local Windows pode setar PYTHON_BIN=py no .env.local
const PYTHON_BIN = process.env.PYTHON_BIN || "python";
// Teto do upload. Agora limita disco, nao RAM -- o arquivo nunca fica em memoria.
const MAX_UPLOAD_MB = Number(process.env.MAX_UPLOAD_MB) || 1024;
const MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024;

type Modo = "suave" | "oculto" | "clean";

export async function POST(req: NextRequest) {
  try {
    let userId: string | null = null;
    let userCredits = 0;

    if (!DEV_MODE) {
      const authHeader = req.headers.get("authorization");
      if (!authHeader) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }
      const token = authHeader.replace("Bearer ", "");
      const supabase = createServerClient(token);

      try {
        const { data, error: authError } = await supabase.auth.getUser();
        if (authError || !data.user) {
          return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }
        userId = data.user.id;
      } catch {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }

      const serviceClient = createServiceClient();
      const { data: profile } = await serviceClient
        .from("profiles")
        .select("credits")
        .eq("id", userId)
        .single();

      if (!profile || profile.credits < 1) {
        return NextResponse.json({ error: "Créditos insuficientes" }, { status: 403 });
      }
      userCredits = profile.credits;
    }

    await garantirTempDir();

    const id = randomUUID();

    // Autenticacao e credito vem antes de aceitar um byte: requisicao sem
    // permissao nao chega a ocupar disco.
    let upload: UploadRecebido;
    try {
      upload = await receberMultipart(req, {
        prefixo: id,
        maxBytes: MAX_BYTES,
        extensaoPadrao: { video: ".mp4", oculto: ".mp3" },
      });
    } catch (err) {
      if (err instanceof UploadError) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      console.error("Upload error:", err);
      return NextResponse.json({ error: "Falha ao receber o arquivo" }, { status: 400 });
    }

    const { campos, arquivos } = upload;
    const modo = (campos.modo as Modo) || "suave";
    const videoPath = arquivos.video?.path ?? null;
    const ocultoPath = arquivos.oculto?.path ?? null;

    // Os campos de texto chegam depois do video no stream, entao a validacao
    // so pode acontecer com o upload ja completo -- por isso limpa o disco em
    // cada saida por erro.
    if (!["suave", "oculto", "clean"].includes(modo)) {
      await upload.limpar();
      return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
    }
    if (!videoPath) {
      await upload.limpar();
      return NextResponse.json({ error: "Nenhum vídeo enviado" }, { status: 400 });
    }
    if (modo === "oculto" && !ocultoPath) {
      await upload.limpar();
      return NextResponse.json({ error: "Modo MP3 oculto requer arquivo oculto" }, { status: 400 });
    }

    const ocultoVolume = campos.oculto_volume
      ? Math.max(0.0005, Math.min(0.1, parseFloat(campos.oculto_volume)))
      : 0.005;
    const startSec = campos.start_sec ? Math.max(0, parseFloat(campos.start_sec)) : 0;
    const cleanMetadata = campos.clean_metadata === undefined ? true : campos.clean_metadata === "true";
    const compress = campos.compress === "true";
    const compressPct = campos.compress_pct
      ? Math.max(10, Math.min(100, parseFloat(campos.compress_pct)))
      : 30;

    const outputPath = join(TEMP_DIR, `${id}_output.mp4`);

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

      if (!DEV_MODE && userId) {
        const serviceClient = createServiceClient();
        await serviceClient
          .from("profiles")
          .update({
            credits: userCredits - 1,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userId);

        await serviceClient.from("credit_usage").insert({
          user_id: userId,
          action: modo,
          credits_used: 1,
        });
      }

      // Entrada ja cumpriu o papel; sai do disco antes do download comecar.
      await upload.limpar();

      const { size } = await stat(outputPath);
      const arquivo = createReadStream(outputPath);
      // O resultado tambem vai por stream: readFile() traria o video inteiro
      // de volta pra RAM, que e metade do problema de memoria original.
      // 'close' cobre tanto o download completo quanto o cliente desistindo
      // no meio -- nos dois casos o arquivo sai do disco.
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
      await upload.limpar();
      await unlink(outputPath).catch(() => {});

      const message = err instanceof Error ? err.message : "Erro no processamento";
      console.error("Process error:", err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
