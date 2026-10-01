import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { extractJson } from "./json";
import { SYSTEM_PROMPT } from "./prompts";

export const MODEL = "claude-sonnet-5-5";

export type AiErrorCode =
  | "not_configured"
  | "credits"
  | "rate_limit"
  | "timeout"
  | "malformed"
  | "unknown";

export class AiError extends Error {
  constructor(public code: AiErrorCode, message: string) {
    super(message);
  }
}

export const AI_MESSAGES: Record<AiErrorCode, string> = {
  not_configured: "La génération IA n'est pas configurée sur ce serveur.",
  credits: "Le crédit du service de génération est épuisé. Réessayez plus tard.",
  rate_limit: "Le service de génération est très sollicité. Réessayez dans une minute.",
  timeout: "La génération a pris trop de temps. Réessayez.",
  malformed: "La réponse générée est inexploitable. Relancez la génération.",
  unknown: "La génération a échoué. Réessayez.",
};

function classify(err: unknown): AiError {
  if (err instanceof AiError) return err;
  const e = err as { status?: number; message?: string; name?: string };
  const msg = (e.message ?? "").toLowerCase();
  if (e.name === "APIConnectionTimeoutError" || msg.includes("timed out")) return new AiError("timeout", AI_MESSAGES.timeout);
  if (e.status === 429) return new AiError("rate_limit", AI_MESSAGES.rate_limit);
  if (msg.includes("credit balance") || e.status === 402) return new AiError("credits", AI_MESSAGES.credits);
  if (e.status === 401) return new AiError("not_configured", AI_MESSAGES.not_configured);
  return new AiError("unknown", AI_MESSAGES.unknown);
}

/** Appelle Claude, valide la sortie avec zod, réessaie une fois si elle est malformée. */
export async function generateJson<T>(
  userPrompt: string,
  schema: ZodType<T>,
  mock: () => T,
): Promise<T> {
  if (process.env.AI_MOCK === "1") return schema.parse(mock());

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError("not_configured", AI_MESSAGES.not_configured);
  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      return schema.parse(extractJson(text));
    } catch (err) {
      const isFormat = err instanceof SyntaxError || (err as { name?: string }).name === "ZodError" || (err as Error).message === "no_json";
      if (isFormat && attempt === 0) continue;
      if (isFormat) throw new AiError("malformed", AI_MESSAGES.malformed);
      throw classify(err);
    }
  }
  throw new AiError("malformed", AI_MESSAGES.malformed);
}
