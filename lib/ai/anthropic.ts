import Anthropic from "@anthropic-ai/sdk";
import type { ZodType } from "zod";
import { extractJson } from "./json";
import { SYSTEM_PROMPT } from "./prompts";

/**
 * Routage par type de tâche (coût / qualité) :
 *  - "light" : tonalité, lives, régénération d'une semaine → Haiku 4.5, ~2 fois moins cher ;
 *  - "heavy" : identité et piliers (les fondations dont dépend tout le reste), ligne éditoriale complète, audit d'images → Sonnet 5.5.
 * Test réel (marque fictive) : Haiku invente des offres absentes du brief, cite une année périmée et fixe des objectifs chiffrés
 * irréalistes dans l'identité et les piliers ; Sonnet reste fidèle au brief. Haiku suffit pour la tonalité et les textes de live.
 * Réglages d'environnement : AI_MODEL force un modèle pour tout ; sinon AI_MODEL_LIGHT / AI_MODEL_HEAVY changent un palier.
 */
export type ModelTier = "light" | "heavy";
export const DEFAULT_MODELS: Record<ModelTier, string> = { light: "claude-haiku-4-5", heavy: "claude-sonnet-5-5" };

export function modelFor(tier: ModelTier, env: Record<string, string | undefined> = process.env): string {
  const forced = env.AI_MODEL?.trim();
  if (forced) return forced;
  const tierEnv = (tier === "light" ? env.AI_MODEL_LIGHT : env.AI_MODEL_HEAVY)?.trim();
  return tierEnv || DEFAULT_MODELS[tier];
}

/**
 * Les modèles de la famille 5 raisonnent par défaut avant de répondre : pour une sortie JSON à structure imposée, ce raisonnement
 * consomme le budget de jetons (réponse vide sur les longues générations) et ajoute du délai et du coût. On le coupe ; la qualité vient des consignes.
 */
export const thinkingFor = (model: string) => (/^claude-(sonnet|opus|fable)-5/.test(model) ? ({ thinking: { type: "between_tools" } } as Record<string, unknown>) : {});

/** Consommation de jetons des appels réels (mesure des coûts : essais et journaux). */
export const usageLog: { model: string; input: number; output: number }[] = [];

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
  userPrompt: string | Anthropic.ContentBlockParam[],
  schema: ZodType<T>,
  mock: () => T,
  tier: ModelTier = "heavy",
  opts: { thinking?: "off"; maxTokens?: number } = {},
): Promise<T> {
  if (process.env.AI_MOCK === "1") return schema.parse(mock());

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AiError("not_configured", AI_MESSAGES.not_configured);
  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });

  let lastText = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await client.messages.create({
        model: modelFor(tier),
        max_tokens: opts.maxTokens ?? 4096,
        ...(opts.thinking === "off" ? thinkingFor(modelFor(tier)) : {}),
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userPrompt }],
      });
      usageLog.push({ model: modelFor(tier), input: res.usage?.input_tokens ?? 0, output: res.usage?.output_tokens ?? 0 });
      const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      lastText = text;
      if (process.env.AI_DEBUG === "1") console.error("[IA] arrêt :", res.stop_reason, "· jetons sortis :", res.usage?.output_tokens);
      return schema.parse(extractJson(text));
    } catch (err) {
      const isFormat = err instanceof SyntaxError || (err as { name?: string }).name === "ZodError" || (err as Error).message === "no_json";
      if (isFormat && process.env.AI_DEBUG === "1") console.error("[IA] réponse refusée :", JSON.stringify((err as { issues?: unknown }).issues ?? (err as Error).message).slice(0, 800), "| début :", lastText.slice(0, 200), "| fin :", lastText.slice(-150));
      if (isFormat && attempt === 0) continue;
      if (isFormat) throw new AiError("malformed", AI_MESSAGES.malformed);
      throw classify(err);
    }
  }
  throw new AiError("malformed", AI_MESSAGES.malformed);
}
