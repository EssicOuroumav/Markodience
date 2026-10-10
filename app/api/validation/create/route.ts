import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { hasFeature, isPlanId } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";
import { createBody, expiryDate, hashToken, newToken, shareUrl } from "@/lib/validation";

export const runtime = "nodejs";
const reply = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status, headers: { "Cache-Control": "no-store" } });

/** Crée un lien de validation pour des publications « À valider ». Le lien n'est montré qu'une fois : seule son empreinte est stockée. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return reply(401, "Connexion requise.");
  const parsed = createBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply(400, "Choisissez au moins une publication et indiquez le nom du validateur.");
  const { post_ids, reviewer, note, days } = parsed.data;

  const { data: planRaw } = await supabase.rpc("my_plan");
  const plan = isAdmin(user) ? "agence" : isPlanId(planRaw) ? planRaw : "gratuit";
  if (!hasFeature(plan, "editorial")) return reply(403, "Le circuit de validation est réservé aux paliers payants.");

  // La sécurité au niveau des lignes ne renvoie que les publications du demandeur.
  const { data: posts } = await supabase.from("posts").select("id, brand_profile_id, status").in("id", post_ids);
  const rows = posts ?? [];
  if (rows.length !== new Set(post_ids).size) return reply(404, "Publication introuvable.");
  if (new Set(rows.map((p) => p.brand_profile_id)).size !== 1) return reply(400, "Les publications doivent appartenir à la même marque.");
  if (rows.some((p) => p.status !== "a_valider")) return reply(409, "Seules les publications « À valider » peuvent être envoyées.");

  const token = newToken();
  const { data: created, error } = await supabase
    .from("validation_requests")
    .insert({ brand_profile_id: rows[0].brand_profile_id, token_hash: hashToken(token), reviewer, note, post_ids: [...new Set(post_ids)], expires_at: expiryDate(days) })
    .select("id")
    .single();
  if (error || !created) return reply(error?.code === "42501" ? 403 : 500, error?.code === "42501" ? "Le circuit de validation est réservé aux paliers payants." : "Le lien n'a pas pu être créé.");
  const origin = process.env.NEXT_PUBLIC_APP_URL?.trim() || new URL(request.url).origin;
  return NextResponse.json({ ok: true, id: created.id, url: shareUrl(origin, token) }, { headers: { "Cache-Control": "no-store" } });
}
