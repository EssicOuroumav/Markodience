import type { SupabaseClient } from "@supabase/supabase-js";

/** Supprime tous les fichiers d'un utilisateur : logos ({user}/…) et fichiers d'audit ({marque}/…). Meilleur effort. */
export async function purgeUserFiles(admin: SupabaseClient, userId: string, brandIds: string[]) {
  async function purge(bucket: string, prefix: string): Promise<number> {
    let removed = 0;
    const { data: items } = await admin.storage.from(bucket).list(prefix, { limit: 1000 });
    if (!items?.length) return 0;
    const files: string[] = [];
    for (const it of items) {
      const full = `${prefix}/${it.name}`;
      if (it.id === null) removed += await purge(bucket, full); // dossier
      else files.push(full);
    }
    if (files.length) {
      const { error } = await admin.storage.from(bucket).remove(files);
      if (!error) removed += files.length;
    }
    return removed;
  }
  let total = await purge("logos", userId);
  for (const id of brandIds) total += await purge("audits", id);
  return total;
}

export const DELETE_PHRASE = "SUPPRIMER";
