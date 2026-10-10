import type { SupabaseClient } from "@supabase/supabase-js";
import { PRECISION } from "../plan/prompts";
import type { Gen } from "../plan/stages";
import { loadStrategyContext } from "../strategy/handlers";
import type { StrategyContext } from "../strategy/prompts";
import { cleanItems, communityOutput, mockCommunity } from "./schemas";

export type CommunityResult = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string, code: string): CommunityResult => ({ status, body: { ok: false, code, error } });

export function communityPrompt(c: StrategyContext): string {
  return `Tu es community manager senior. Prépare le guide de modération de cette marque : réponses types, scripts pour les situations difficiles, et protocole de gestion de crise.
<marque>
${JSON.stringify({ nom: c.brand.name, secteur: c.brand.sector, statut: c.brand.status === "organisation" ? "organisation" : "freelance", presentation: c.brand.about, reseaux: c.brand.networks }, null, 2)}
</marque>
<identite>
${JSON.stringify(c.identity, null, 2)}
</identite>
<publics>
${c.personas.map((p) => `- ${p.name} : besoins ${p.needs} ; freins ${p.frictions} ; ton ${p.tone}`).join("\n") || "- non définis"}
</publics>

${PRECISION}
- 8 éléments « faq » : les questions que ce public pose vraiment à CETTE marque (accès, prix ou dons, horaires, fonctionnement, confiance, partenariats…). title = la question ; body = la réponse validée en 2 phrases (45 mots max) avec le prochain pas. N'invente jamais un prix, une date, un chiffre ou une adresse : écris [à compléter] à la place.
- 5 éléments « script » : des situations difficiles réelles pour cette marque (critique publique, demande de preuve, comparaison, message sensible, troll). title = la situation (10 mots max) ; situation = le contexte en une phrase ; body = le texte exact à envoyer (60 mots max), ton conforme à l'identité, jamais défensif.
- 3 éléments « crise », un par niveau : « faible », « moyen », « grave ». title = le type d'incident ; situation = comment le reconnaître ; body = 3 à 4 étapes numérotées dans l'ordre, avec qui décide (rôle, pas un prénom) et ce qu'on arrête de publier.
- Respecte les sujets à éviter. Aucune promesse que la marque ne peut pas tenir.

Structure JSON exacte :
{ "items": [{ "kind": "faq"|"script"|"crise", "title": string, "situation": string, "body": string, "level"?: "faible"|"moyen"|"grave" }] }
Réponds uniquement par le JSON.`;
}

/** Remplace les éléments générés par l'IA ; ceux écrits à la main sont conservés. */
export async function handleCommunity(supabase: SupabaseClient, brandId: string, gen: Gen): Promise<CommunityResult> {
  const ctx = await loadStrategyContext(supabase, brandId);
  if (!ctx) return fail(404, "Profil de marque introuvable.", "not_found");
  if (!ctx.identity.positioning) return fail(409, "Définissez d'abord l'identité de la marque.", "identity_missing");
  const out = await gen(communityPrompt(ctx), communityOutput, "heavy", mockCommunity);
  const rows = cleanItems(out);
  if (rows.length < 6) return fail(502, "Le guide généré est incomplet. Réessayez.", "incomplete");
  const { count } = await supabase.from("community_items").select("id", { count: "exact", head: true }).eq("brand_profile_id", brandId).eq("source", "manuel");
  if ((count ?? 0) + rows.length > 80) return fail(409, "Trop d'éléments : supprimez-en quelques-uns avant de générer.", "cap");
  if ((await supabase.from("community_items").delete().eq("brand_profile_id", brandId).eq("source", "ia")).error) return fail(500, "Les anciens éléments n'ont pas pu être remplacés.", "db");
  const { error } = await supabase.from("community_items").insert(rows.map((r, i) => ({ brand_profile_id: brandId, ...r, source: "ia", position: i })));
  if (error) return fail(500, "Le guide n'a pas pu être enregistré.", "db");
  return { status: 200, body: { ok: true, data: { count: rows.length } } };
}
