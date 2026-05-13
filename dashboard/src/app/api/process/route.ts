import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";

const execFileAsync = promisify(execFile);

const UPLOAD_DIR = join(process.cwd(), "public", "uploads");
const SCRIPTS_DIR = join(process.cwd(), "..");
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";

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

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const modo = (formData.get("modo") as Modo) || "suave";
    const videoFile = formData.get("video") as File;
    const ocultoFile = formData.get("oculto") as File | null;
    const ocultoVolumeRaw = formData.get("oculto_volume") as string | null;
    const startSecRaw = formData.get("start_sec") as string | null;
    const cleanMetaRaw = formData.get("clean_metadata") as string | null;
    const compressRaw = formData.get("compress") as string | null;
    const compressPctRaw = formData.get("compress_pct") as string | null;

    if (!["suave", "oculto", "clean"].includes(modo)) {
      return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
    }
    if (!videoFile) {
      return NextResponse.json({ error: "Nenhum vídeo enviado" }, { status: 400 });
    }
    if (modo === "oculto" && !ocultoFile) {
      return NextResponse.json({ error: "Modo MP3 oculto requer arquivo oculto" }, { status: 400 });
    }

    const ocultoVolume = ocultoVolumeRaw ? Math.max(0.0005, Math.min(0.1, parseFloat(ocultoVolumeRaw))) : 0.005;
    const startSec = startSecRaw ? Math.max(0, parseFloat(startSecRaw)) : 0;
    const cleanMetadata = cleanMetaRaw === null ? true : cleanMetaRaw === "true";
    const compress = compressRaw === "true";
    const compressPct = compressPctRaw ? Math.max(10, Math.min(100, parseFloat(compressPctRaw))) : 30;

    const id = randomUUID();
    const videoPath = join(UPLOAD_DIR, `${id}_input.mp4`);
    const outputPath = join(UPLOAD_DIR, `${id}_output.mp4`);
    let ocultoPath: string | null = null;

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    await writeFile(videoPath, videoBuffer);

    if (ocultoFile) {
      const ext = ocultoFile.name.includes(".") ? ocultoFile.name.slice(ocultoFile.name.lastIndexOf(".")) : ".mp3";
      ocultoPath = join(UPLOAD_DIR, `${id}_oculto${ext}`);
      const ocultoBuffer = Buffer.from(await ocultoFile.arrayBuffer());
      await writeFile(ocultoPath, ocultoBuffer);
    }

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
        "python",
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

      const resultBuffer = await readFile(outputPath);

      await unlink(videoPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
      if (ocultoPath) await unlink(ocultoPath).catch(() => {});

      return new NextResponse(new Uint8Array(resultBuffer), {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="hiddencopy_${modo}_${id}.mp4"`,
        },
      });
    } catch (err) {
      await unlink(videoPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
      if (ocultoPath) await unlink(ocultoPath).catch(() => {});

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
