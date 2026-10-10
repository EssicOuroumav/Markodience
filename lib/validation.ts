import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

/** Circuit de validation par lien : le validateur n'a pas de compte, il reçoit un lien secret et valable quelques jours. */
export const EXPIRY_CHOICES = [3, 7, 14, 30] as const;
export const MAX_POSTS_PER_REQUEST = 40;

/** Jeton aléatoire de 256 bits : impossible à deviner. Seule son empreinte est enregistrée. */
export const newToken = () => randomBytes(32).toString("base64url");
export const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
export const isTokenShape = (token: unknown): token is string => typeof token === "string" && /^[A-Za-z0-9_-]{43}$/.test(token);

export type RequestState = "ok" | "expired" | "revoked";
export function requestState(r: { expires_at: string; revoked_at: string | null }, now: Date = new Date()): RequestState {
  if (r.revoked_at) return "revoked";
  return Date.parse(r.expires_at) <= now.getTime() ? "expired" : "ok";
}

export const expiryDate = (days: number, now: Date = new Date()) => new Date(now.getTime() + days * 86_400_000).toISOString();

export const createBody = z.object({
  post_ids: z.array(z.string().uuid()).min(1).max(MAX_POSTS_PER_REQUEST),
  reviewer: z.string().trim().min(1).max(120),
  note: z.string().trim().max(1000).default(""),
  days: z.number().int().refine((d) => (EXPIRY_CHOICES as readonly number[]).includes(d)).default(7),
});

export const decideBody = z.object({
  token: z.string().refine(isTokenShape),
  post_id: z.string().uuid(),
  decision: z.enum(["approuve", "modifs"]),
  comment: z.string().trim().max(1000).default(""),
});
/** Une demande de modification doit dire quoi modifier. */
export const decisionError = (b: z.infer<typeof decideBody>) => (b.decision === "modifs" && b.comment.length < 3 ? "Dites en quelques mots ce qu'il faut modifier." : null);

/** Statut de la publication après la décision du validateur. */
export const statusAfter = (decision: "approuve" | "modifs") => (decision === "approuve" ? ("programme" as const) : ("brouillon" as const));

export function shareUrl(origin: string, token: string): string {
  return `${origin.replace(/\/$/, "")}/validation/${token}`;
}
