import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, unlink } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";
import { randomUUID } from "crypto";
import { createServerClient, createServiceClient } from "@/lib/supabase-server";
import { TEMP_DIR, garantirTempDir } from "@/lib/upload-stream";

const execFileAsync = promisify(execFile);
const SCRIPTS_DIR = join(process.cwd(), "..");
const DEV_MODE = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const PYTHON_BIN = process.env.PYTHON_BIN || "python";

type Intensidade = "leve" | "medio" | "forte";

const INTENSIDADES: Intensidade[] = ["leve", "medio", "forte"];

// Formatos aceitos e a extensao usada na saida. PNG entra mas sai JPEG:
// arquivo PNG e, por si so, um sinal de imagem gerada -- camera nao produz PNG.
const FORMATOS: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MAX_BYTES = 25 * 1024 * 1024;

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

    const formData = await req.formData();
    const intensidade = (formData.get("intensidade") as Intensidade) || "medio";
    const imagemFile = formData.get("imagem") as File | null;

    if (!INTENSIDADES.includes(intensidade)) {
      return NextResponse.json({ error: "Intensidade inválida" }, { status: 400 });
    }
    if (!imagemFile) {
      return NextResponse.json({ error: "Nenhuma imagem enviada" }, { status: 400 });
    }
    if (!FORMATOS[imagemFile.type]) {
      return NextResponse.json(
        { error: "Formato não suportado. Use JPG, PNG ou WEBP" },
        { status: 400 }
      );
    }
    if (imagemFile.size > MAX_BYTES) {
      return NextResponse.json({ error: "Imagem muito grande (máx. 25MB)" }, { status: 400 });
    }

    const id = randomUUID();
    const inExt = FORMATOS[imagemFile.type];
    // PNG sai como JPEG; os demais mantem o formato de entrada
    const outExt = inExt === ".png" ? ".jpg" : inExt;
    const inputPath = join(TEMP_DIR, `${id}_input${inExt}`);
    const outputPath = join(TEMP_DIR, `${id}_output${outExt}`);

    const imagemBuffer = Buffer.from(await imagemFile.arrayBuffer());
    await writeFile(inputPath, imagemBuffer);

    const config = {
      input: inputPath,
      output: outputPath,
      intensidade,
      seed: null,
    };

    // finally, e nao limpeza nos dois ramos: o retorno de sucesso ja tem o
    // buffer em memoria quando o finally roda, entao qualquer caminho de
    // saida daqui pra baixo -- inclusive um throw inesperado -- apaga os
    // temporarios. Nada de midia do usuario sobra no disco.
    try {
      const scriptPath = join(SCRIPTS_DIR, "image_cloaker.py");
      const { stdout, stderr } = await execFileAsync(
        PYTHON_BIN,
        [scriptPath, JSON.stringify(config)],
        { timeout: 300000, maxBuffer: 10 * 1024 * 1024 }
      );
      if (stderr) console.log("[image_cloaker stderr]", stderr);
      console.log("[image_cloaker stdout]", stdout);

      // ultima linha do stdout e o JSON com as metricas da analise
      let analise: Record<string, unknown> = {};
      const linhas = stdout.trim().split("\n");
      try {
        analise = JSON.parse(linhas[linhas.length - 1]);
      } catch {
        // metricas sao opcionais, nao derrubam a requisicao
      }

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
          action: "imagem",
          credits_used: 1,
        });
      }

      const resultBuffer = await readFile(outputPath);

      const mime = outExt === ".webp" ? "image/webp" : "image/jpeg";
      return new NextResponse(new Uint8Array(resultBuffer), {
        headers: {
          "Content-Type": mime,
          "Content-Disposition": `attachment; filename="hiddencopy_${intensidade}_${id}${outExt}"`,
          "X-Analise": encodeURIComponent(JSON.stringify(analise)),
        },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro no processamento";
      console.error("Process image error:", err);
      return NextResponse.json({ error: message }, { status: 500 });
    } finally {
      await unlink(inputPath).catch(() => {});
      await unlink(outputPath).catch(() => {});
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("API error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
