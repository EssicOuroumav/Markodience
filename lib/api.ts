import { notifyProgress } from "./progressEvents";

/** `network` : la requête n'a reçu aucune réponse (connexion coupée) ; le serveur a pu terminer son travail malgré tout. */
export type GenerateResult = { ok: true; data: unknown } | { ok: false; error: string; network?: boolean };

/** Appelle /api/generate ; ne lève jamais, renvoie toujours un message affichable. */
export async function callGenerate(body: unknown): Promise<GenerateResult> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok) {
      notifyProgress();
      return { ok: true, data: json.data };
    }
    return { ok: false, error: json?.error ?? "La génération a échoué. Réessayez." };
  } catch {
    return { ok: false, error: "Connexion impossible. Vérifiez votre réseau et réessayez.", network: true };
  }
}
