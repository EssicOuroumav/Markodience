import type { SupabaseClient } from "@supabase/supabase-js";

export const LIBRARY_MAX_FILES = 200;
export const LIBRARY_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const LIBRARY_ACCEPTED = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "application/pdf": "pdf" } as const;
export type LibraryMime = keyof typeof LIBRARY_ACCEPTED;

export const ASSET_CATEGORIES = ["logo", "photo", "visuel", "document", "autre"] as const;
export type AssetCategory = (typeof ASSET_CATEGORIES)[number];
export const ASSET_CATEGORY_LABEL: Record<AssetCategory, string> = { logo: "Logos", photo: "Photos", visuel: "Visuels", document: "Documents", autre: "Autres" };

export type Asset = { id: string; brand_profile_id: string; name: string; category: AssetCategory; path: string; mime: string; size_bytes: number; created_at: string };

export function validateAssetFile(file: { type: string; size: number }): string | null {
  if (!(file.type in LIBRARY_ACCEPTED)) return "Format non pris en charge (PNG, JPG, WebP ou PDF).";
  if (file.size === 0) return "Fichier vide.";
  if (file.size > LIBRARY_MAX_FILE_BYTES) return "Fichier trop volumineux (10 Mo maximum).";
  return null;
}

/** Catégorie proposée à l'ajout : un PDF est un document, le reste est rangé en photos. */
export const guessCategory = (mime: string): AssetCategory => (mime === "application/pdf" ? "document" : "photo");

/** Nom affiché : le nom du fichier sans son extension. */
export const displayName = (fileName: string) => fileName.replace(/\.[^.]*$/, "").replace(/[_]+/g, " ").trim().slice(0, 80) || "Fichier";

/** Chemin de stockage : un dossier par marque, un nom généré (jamais celui du fichier envoyé). */
export const assetPath = (brandId: string, id: string, mime: LibraryMime) => `${brandId}/${id}.${LIBRARY_ACCEPTED[mime]}`;

export const isImage = (mime: string) => mime.startsWith("image/");
export const totalBytes = (assets: Pick<Asset, "size_bytes">[]) => assets.reduce((n, a) => n + Number(a.size_bytes), 0);

/** Supprime les fichiers d'une marque avant la suppression de la marque (bibliothèque et audits). Au mieux : ne bloque jamais. */
export async function purgeBrandFiles(supabase: SupabaseClient, brandId: string): Promise<void> {
  for (const bucket of ["library", "audits"]) {
    try {
      const { data: items } = await supabase.storage.from(bucket).list(brandId, { limit: 1000 });
      const files = (items ?? []).filter((i) => i.id !== null).map((i) => `${brandId}/${i.name}`);
      if (files.length) await supabase.storage.from(bucket).remove(files);
      // Les audits rangent leurs fichiers dans un sous-dossier par audit.
      for (const dir of (items ?? []).filter((i) => i.id === null)) {
        const { data: inner } = await supabase.storage.from(bucket).list(`${brandId}/${dir.name}`, { limit: 1000 });
        const paths = (inner ?? []).map((i) => `${brandId}/${dir.name}/${i.name}`);
        if (paths.length) await supabase.storage.from(bucket).remove(paths);
      }
    } catch {
      /* meilleur effort */
    }
  }
}
