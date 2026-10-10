import type { SupabaseClient } from "@supabase/supabase-js";
import { hashToken, isTokenShape, requestState, statusAfter } from "./validation";

export type RequestRow = { id: string; brand_profile_id: string; reviewer: string; note: string; post_ids: string[]; expires_at: string; revoked_at: string | null };

/** Retrouve la demande d'un lien (clé de service : le validateur n'a pas de session). Renvoie null si le lien est faux. */
export async function loadRequest(admin: SupabaseClient, token: unknown): Promise<RequestRow | null> {
  if (!isTokenShape(token)) return null;
  const { data } = await admin.from("validation_requests").select("id, brand_profile_id, reviewer, note, post_ids, expires_at, revoked_at").eq("token_hash", hashToken(token)).maybeSingle();
  return (data as RequestRow | null) ?? null;
}

export type ReviewPost = { id: string; channel: string | null; scheduled_date: string | null; format: string | null; caption: string; visual_idea: string; hashtags: string; call_to_action: string; design_link: string | null; status: string; pillar: string | null };

/** Ce que voit le validateur : uniquement les publications de SA demande, et seulement les champs utiles à la relecture. */
export async function reviewPosts(admin: SupabaseClient, req: RequestRow): Promise<ReviewPost[]> {
  const { data } = await admin
    .from("posts")
    .select("id, channel, scheduled_date, format, caption, visual_idea, hashtags, call_to_action, design_link, status, pillar")
    .in("id", req.post_ids)
    .eq("brand_profile_id", req.brand_profile_id)
    .order("scheduled_date", { ascending: true });
  return (data as ReviewPost[]) ?? [];
}

export type DecideResult = { ok: true } | { ok: false; status: number; error: string };

/** Enregistre la décision d'un validateur. Une publication n'est décidée qu'une fois (tant qu'elle est « À valider »). */
export async function recordDecision(admin: SupabaseClient, req: RequestRow, postId: string, decision: "approuve" | "modifs", comment: string): Promise<DecideResult> {
  const state = requestState(req);
  if (state !== "ok") return { ok: false, status: 410, error: state === "expired" ? "Ce lien a expiré. Demandez-en un nouveau." : "Ce lien a été désactivé." };
  if (!req.post_ids.includes(postId)) return { ok: false, status: 404, error: "Publication introuvable." };
  const patch = decision === "approuve" ? { status: statusAfter(decision), review_note: null } : { status: statusAfter(decision), review_note: comment };
  const { data, error } = await admin.from("posts").update(patch).eq("id", postId).eq("brand_profile_id", req.brand_profile_id).eq("status", "a_valider").select("id");
  if (error) return { ok: false, status: 500, error: "La décision n'a pas pu être enregistrée." };
  if (!data || data.length === 0) return { ok: false, status: 409, error: "Cette publication a déjà été traitée." };
  await admin.from("post_reviews").insert({ post_id: postId, request_id: req.id, reviewer: req.reviewer, decision, comment });
  return { ok: true };
}
