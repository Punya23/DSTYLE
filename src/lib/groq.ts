/**
 * Minimal Groq client (OpenAI-compatible chat completions over fetch — no SDK
 * dependency). Powers the AI stylist and the admin AI insights. Everything
 * degrades gracefully: with no key, or on any network/parse error, the callers
 * fall back to their non-AI paths, so the storefront never hangs or breaks.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

// Default is a strong, fast, inexpensive model — good for a storefront concierge
// and a small token budget. Override with GROQ_MODEL.
export const DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";

export type GroqMessage = { role: "system" | "user" | "assistant"; content: string };

/** Reads the key under any of the names the project might use. */
export function groqKey(): string | null {
  return (
    process.env.GROQ_API_KEY ||
    process.env.GROK_API_KEY ||
    process.env.grok ||
    null
  );
}

export function groqConfigured(): boolean {
  return Boolean(groqKey());
}

/**
 * Calls Groq in JSON mode and returns the parsed object, or null on any failure.
 * The caller's prompt MUST describe the exact JSON shape and use the word "json"
 * somewhere (required by OpenAI-compatible json_object mode).
 */
export async function groqJSON<T>(opts: {
  messages: GroqMessage[];
  model?: string;
  maxTokens?: number;
  temperature?: number;
}): Promise<T | null> {
  const key = groqKey();
  if (!key) return null;

  const model = opts.model || process.env.GROQ_MODEL || DEFAULT_GROQ_MODEL;

  try {
    const res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.6,
        max_tokens: opts.maxTokens ?? 800,
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      console.error("[groq] HTTP", res.status, (await res.text().catch(() => "")).slice(0, 300));
      return null;
    }

    const data = await res.json();
    const content: unknown = data?.choices?.[0]?.message?.content;
    if (typeof content !== "string") return null;
    return JSON.parse(content) as T;
  } catch (err) {
    console.error("[groq] error:", err);
    return null;
  }
}
