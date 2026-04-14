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

export async function POST(req: NextRequest) {
  try {
    // Verificar autenticação
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabase = createServerClient(token);

    let user;
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
      }
      user = data.user;
    } catch {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Verificar créditos
    const serviceClient = createServiceClient();
    const { data: profile } = await serviceClient
      .from("profiles")
      .select("credits")
      .eq("id", user.id)
      .single();

    if (!profile || profile.credits < 1) {
      return NextResponse.json({ error: "Créditos insuficientes" }, { status: 403 });
    }

    if (!existsSync(UPLOAD_DIR)) {
      await mkdir(UPLOAD_DIR, { recursive: true });
    }

    const formData = await req.formData();
    const modo = formData.get("modo") as string;
    const videoFile = formData.get("video") as File;

    if (!videoFile) {
      return NextResponse.json({ error: "Nenhum vídeo enviado" }, { status: 400 });
    }

    const id = randomUUID();
    const videoPath = join(UPLOAD_DIR, `${id}_input.mp4`);
    const outputPath = join(UPLOAD_DIR, `${id}_output.mp4`);

    const videoBuffer = Buffer.from(await videoFile.arrayBuffer());
    await writeFile(videoPath, videoBuffer);

    try {
      if (modo === "melhorar") {
        const scriptPath = join(SCRIPTS_DIR, "melhorar_audio.py");
        await execFileAsync("python", [scriptPath, videoPath, outputPath], {
          timeout: 300000,
        });
      } else if (modo === "mesclar") {
        const musicFile = formData.get("music") as File;

        if (!musicFile) {
          return NextResponse.json({ error: "Nenhuma música enviada" }, { status: 400 });
        }

        const musicPath = join(UPLOAD_DIR, `${id}_music.mp3`);
        const musicBuffer = Buffer.from(await musicFile.arrayBuffer());
        await writeFile(musicPath, musicBuffer);

        const scriptPath = join(SCRIPTS_DIR, "mesclar_audio.py");
        await execFileAsync("python", [scriptPath, videoPath, musicPath, outputPath], {
          timeout: 300000,
        });

        await unlink(musicPath).catch(() => {});
      } else {
        return NextResponse.json({ error: "Modo inválido" }, { status: 400 });
      }

      // Descontar 1 crédito após processamento bem-sucedido
      await serviceClient
        .from("profiles")
        .update({
          credits: profile.credits - 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      // Registrar uso
      await serviceClient.from("credit_usage").insert({
        user_id: user.id,
        action: modo,
        credits_used: 1,
      });

      const resultBuffer = await readFile(outputPath);

      await unlink(videoPath).catch(() => {});
      await unlink(outputPath).catch(() => {});

      return new NextResponse(resultBuffer, {
        headers: {
          "Content-Type": "video/mp4",
          "Content-Disposition": `attachment; filename="hiddencopy_${modo}_${id}.mp4"`,
        },
      });
    } catch (err) {
      await unlink(videoPath).catch(() => {});
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
