export const MAX_FILES = 5;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
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
