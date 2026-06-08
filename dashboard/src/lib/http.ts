// Safely read an error message from a fetch Response.
// API routes return JSON ({ error }), but server-level failures (404, 413,
// crashes, proxy pages) return HTML. Calling res.json() on HTML throws the
// cryptic "Unexpected token '<', "<!DOCTYPE "... is not valid JSON".
// This reads the body once as text and only parses JSON when it actually is.
export async function readError(res: Response, fallback = "Erro inesperado"): Promise<string> {
  const text = await res.text().catch(() => "");
  const trimmed = text.trim();

  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      const data = JSON.parse(trimmed);
      if (data?.error) return data.error as string;
    } catch {
      // fall through to status-based message
    }
  }

  // HTML or empty body — surface the HTTP status instead of the raw markup.
  return `${fallback} (HTTP ${res.status})`;
}
