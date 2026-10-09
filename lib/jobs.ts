import type { SupabaseClient } from "@supabase/supabase-js";

export type JobStatus = "running" | "done" | "error";
export type JobRow = { id: string; user_id: string; type: string; status: JobStatus; result: unknown; http_status: number | null };

/**
 * Demandes de génération en arrière-plan (table ai_jobs, écrite par le serveur uniquement).
 * L'identifiant vient du navigateur : rejouer la même demande (coupure de connexion, nouvel essai automatique)
 * retrouve la ligne existante au lieu de relancer le travail et de consommer un nouveau crédit.
 */
export type CreateJob = { ok: true } | { ok: false; reason: "exists" | "error" };

export async function createJob(admin: SupabaseClient, job: { id: string; userId: string; type: string }): Promise<CreateJob> {
  const { error } = await admin.from("ai_jobs").insert({ id: job.id, user_id: job.userId, type: job.type });
  if (!error) return { ok: true };
  return { ok: false, reason: error.code === "23505" ? "exists" : "error" };
}

export async function getJob(admin: SupabaseClient, id: string): Promise<JobRow | null> {
  const { data } = await admin.from("ai_jobs").select("id, user_id, type, status, result, http_status").eq("id", id).maybeSingle();
  return (data as JobRow | null) ?? null;
}

export async function finishJob(admin: SupabaseClient, id: string, outcome: { ok: boolean; body: unknown; status: number }) {
  await admin
    .from("ai_jobs")
    .update({ status: outcome.ok ? "done" : "error", result: outcome.body, http_status: outcome.status, finished_at: new Date().toISOString() })
    .eq("id", id);
}

export async function deleteJob(admin: SupabaseClient, id: string) {
  await admin.from("ai_jobs").delete().eq("id", id);
}

/** Nettoyage occasionnel des demandes de plus de deux jours (appelé sur une fraction des requêtes). */
export async function purgeOldJobs(admin: SupabaseClient) {
  await admin.from("ai_jobs").delete().lt("created_at", new Date(Date.now() - 2 * 86_400_000).toISOString());
}
