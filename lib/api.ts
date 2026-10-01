export type GenerateResult = { ok: true; data: unknown } | { ok: false; error: string };

/** Appelle /api/generate ; ne lève jamais, renvoie toujours un message affichable. */
export async function callGenerate(body: unknown): Promise<GenerateResult> {
  try {
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (res.ok && json?.ok) return { ok: true, data: json.data };
    return { ok: false, error: json?.error ?? "La génération a échoué. Réessayez." };
  } catch {
    return { ok: false, error: "Connexion impossible. Vérifiez votre réseau et réessayez." };
  }
}
