import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/payments/admin";

/**
 * Limitation de débit (fenêtre fixe) partagée par toutes les instances : le compteur vit dans la base (fonction consume_rate_limit),
 * donc un attaquant ne la contourne pas en tombant sur une autre instance. Si la base ne répond pas, on retombe sur un compteur
 * local à l'instance : mieux qu'aucune limite, et le site ne bloque jamais à cause du limiteur.
 */

// ───────────── Repli local (par instance) ─────────────
const hits = new Map<string, number[]>();

export function memoryLimit(key: string, max: number, windowMs: number, now = Date.now()): boolean {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > 5000) hits.clear();
  return true;
}

/** Les clés contiennent des données du visiteur (adresse IP, identifiant) : on les réduit à une empreinte de taille fixe. */
export const limitKey = (key: string) => {
  const [bucket, ...rest] = key.split(":");
  return `${bucket.slice(0, 30)}:${createHash("sha256").update(rest.join(":")).digest("hex").slice(0, 32)}`;
};

/** Adresse IP du visiteur. Sur Vercel, l'en-tête x-forwarded-for est posé par Vercel (jamais repris du navigateur). */
export const ipOf = (h: Pick<Headers, "get">) => h.get("x-forwarded-for")?.split(",")[0].trim() || h.get("x-real-ip") || "unknown";

/** true = autorisé, false = limite atteinte. */
export async function rateLimit(key: string, max: number, windowSeconds: number): Promise<boolean> {
  try {
    const { data, error } = await createAdminClient().rpc("consume_rate_limit", { p_key: limitKey(key), p_max: max, p_window_seconds: windowSeconds });
    if (error || typeof data !== "boolean") throw error ?? new Error("réponse inattendue");
    return data;
  } catch {
    return memoryLimit(key, max, windowSeconds * 1000);
  }
}

export const tooMany = (message = "Trop de demandes. Patientez quelques minutes puis réessayez.") =>
  NextResponse.json({ ok: false, code: "rate_limited", error: message }, { status: 429, headers: { "Retry-After": "60", "Cache-Control": "no-store" } });
