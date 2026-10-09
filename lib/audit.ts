export const MAX_FILES = 8;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
/** Poids total d'un audit : l'envoi à l'IA gonfle les fichiers d'un tiers (base64) et sa limite de requête est de 32 Mo. */
export const MAX_TOTAL_BYTES = 20 * 1024 * 1024;

/** Réseaux auditables : un audit analyse un seul réseau, pour un score et des priorités propres à ce réseau. */
export const AUDIT_NETWORKS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "WhatsApp", "Site web", "Autre"] as const;
export type AuditNetwork = (typeof AUDIT_NETWORKS)[number];
export const isAuditNetwork = (v: unknown): v is AuditNetwork => typeof v === "string" && (AUDIT_NETWORKS as readonly string[]).includes(v);

export const formatMegabytes = (bytes: number) => `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;

/** Poids total des fichiers : message d'erreur ou null. */
export function validateTotal(sizes: number[]): string | null {
  const total = sizes.reduce((a, b) => a + b, 0);
  return total > MAX_TOTAL_BYTES ? `Poids total trop élevé (${formatMegabytes(total)} sur ${formatMegabytes(MAX_TOTAL_BYTES)} maximum par audit). Retirez un fichier ou réduisez les captures.` : null;
}
export const ACCEPTED = { "image/png": "png", "image/jpeg": "jpg", "application/pdf": "pdf" } as const;

export function validateFile(file: { type: string; size: number }): string | null {
  if (!(file.type in ACCEPTED)) return "Format non pris en charge (PNG, JPG ou PDF uniquement).";
  if (file.size > MAX_FILE_BYTES) return "Fichier trop volumineux (10 Mo maximum).";
  if (file.size === 0) return "Fichier vide.";
  return null;
}

/** Nom de stockage sûr : ASCII, sans chemin, extension déduite du type MIME (pas du nom). */
export function storageName(index: number, originalName: string, mime: keyof typeof ACCEPTED): string {
  const base = originalName
    .replace(/\.[^.]*$/, "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${index + 1}-${base || "fichier"}.${ACCEPTED[mime]}`;
}
