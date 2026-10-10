import type { SupabaseClient } from "@supabase/supabase-js";
import { PRECISION } from "../plan/prompts";
import type { Gen } from "../plan/stages";
import { loadStrategyContext } from "../strategy/handlers";
import { kpiState } from "../performance";
import { auditSeries } from "../auditTrend";
import { assistantOutput, mockAssistant, TASK_INFO, type AssistantTask } from "./schemas";

export type AssistantResult = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string, code: string): AssistantResult => ({ status, body: { ok: false, code, error } });

const INSTRUCTIONS: Record<AssistantTask, string> = {
  analyse: `Analyse la performance. 3 à 5 sections : ce qui progresse, ce qui bloque, la cause probable de chaque écart (une hypothèse, dite comme telle), ce qu'il faut mesurer de plus. Appuie chaque constat sur un chiffre fourni ; s'il n'y a pas de donnée, dis-le au lieu d'estimer.`,
  recommandations: `Donne exactement 5 recommandations classées de la plus urgente à la moins urgente. Chaque section : heading = la recommandation, body = pourquoi (appuyé sur une donnée fournie) et la première action concrète. Termine par les actions à faire cette semaine.`,
  reponse: `Rédige 3 réponses différentes au message reçu (sections « Réponse courte », « Réponse chaleureuse », « Réponse à envoyer en privé »), dans la voix de la marque, en t'appuyant sur les réponses types. N'invente jamais un prix, une date, une adresse ou un engagement : écris [à compléter]. Si le message est une critique grave ou une rumeur, signale-le dans summary et renvoie vers le protocole de crise.`,
  risques: `Identifie 4 à 6 risques réels pour CE plan (réputation, dépendance à une personne ou un réseau, planning, consentement et données personnelles, objectifs irréalistes). Chaque section : heading = le risque (niveau faible/modéré/élevé), body = comment il se produirait et comment l'éviter.`,
  rapport: `Rédige le rapport mensuel pour la direction : sections Résultats du mois, Enseignements, Difficultés, Actions du mois prochain. Ton sobre et factuel, chiffres exacts uniquement.`,
};

async function loadData(supabase: SupabaseClient, brandId: string) {
  const [defs, vals, acts, posts, audits, items] = await Promise.all([
    supabase.from("kpi_definitions").select("id, name, unit, direction, baseline, target, alert_threshold, owner, corrective_action").eq("brand_profile_id", brandId).order("position"),
    supabase.from("kpi_values").select("definition_id, month, value").eq("brand_profile_id", brandId).order("month", { ascending: false }).limit(300),
    supabase.from("kpi_actions").select("title, status, due_date").eq("brand_profile_id", brandId).order("created_at", { ascending: false }).limit(30),
    supabase.from("posts").select("status").eq("brand_profile_id", brandId),
    supabase.from("audits").select("id, created_at, report_data").eq("brand_profile_id", brandId).order("created_at", { ascending: false }).limit(20),
    supabase.from("community_items").select("kind, title, body").eq("brand_profile_id", brandId).limit(40),
  ]);
  const values = (vals.data ?? []).map((v) => ({ definition_id: v.definition_id as string, month: v.month as string, value: Number(v.value) }));
  const indicators = (defs.data ?? []).map((d) => {
    const series = values.filter((v) => v.definition_id === d.id).sort((a, b) => b.month.localeCompare(a.month));
    const last = series[0]?.value ?? null;
    const def = { baseline: d.baseline === null ? null : Number(d.baseline), target: d.target === null ? null : Number(d.target), alert_threshold: d.alert_threshold === null ? null : Number(d.alert_threshold), direction: d.direction };
    return { nom: d.name, unite: d.unit, depart: def.baseline, objectif: def.target, seuil_alerte: def.alert_threshold, responsable: d.owner, derniere_valeur: last, precedente: series[1]?.value ?? null, etat: kpiState(def, last), action_corrective: d.corrective_action };
  });
  const byStatus: Record<string, number> = {};
  for (const p of posts.data ?? []) byStatus[p.status as string] = (byStatus[p.status as string] ?? 0) + 1;
  return {
    indicators,
    actions: acts.data ?? [],
    posts: byStatus,
    audits: auditSeries((audits.data ?? []) as never).map((s) => ({ reseau: s.network, dernier_score: s.last.score, variation: s.delta })),
    reponses_types: (items.data ?? []).filter((i) => i.kind !== "crise").slice(0, 14).map((i) => ({ question: i.title, reponse: String(i.body).slice(0, 220) })),
  };
}

export async function handleAssistant(supabase: SupabaseClient, brandId: string, task: AssistantTask, input: string, gen: Gen): Promise<AssistantResult> {
  const ctx = await loadStrategyContext(supabase, brandId);
  if (!ctx) return fail(404, "Profil de marque introuvable.", "not_found");
  if (!ctx.identity.positioning) return fail(409, "Définissez d'abord l'identité de la marque.", "identity_missing");
  if (TASK_INFO[task].needsInput && input.trim().length < 3) return fail(400, "Collez le message à traiter.", "input_missing");
  const data = await loadData(supabase, brandId);
  const prompt = `Tu es community manager senior et conseiller de cette marque. Ta réponse sera lue par une personne non spécialiste : phrases courtes, mots simples, aucun jargon.
<marque>
${JSON.stringify({ nom: ctx.brand.name, secteur: ctx.brand.sector, statut: ctx.brand.status, presentation: ctx.brand.about, reseaux: ctx.brand.networks }, null, 2)}
</marque>
<identite>
${JSON.stringify(ctx.identity, null, 2)}
</identite>
<publics>
${ctx.personas.map((p) => `- ${p.name} : ${p.needs} (ton : ${p.tone})`).join("\n") || "- non définis"}
</publics>
<piliers>
${ctx.pillars.map((p) => `- ${p.name}`).join("\n") || "- aucun"}
</piliers>
<donnees>
${JSON.stringify(data, null, 2)}
</donnees>
${input.trim() ? `<message_recu>\n${input.trim().slice(0, 1500)}\n</message_recu>\n` : ""}
${PRECISION}
- ${INSTRUCTIONS[task]}
- Utilise uniquement les données ci-dessus. Ne cite aucun chiffre qui n'y figure pas. Si une donnée manque pour conclure, dis-le dans summary et dis quoi saisir.
- summary : 2 phrases (50 mots max). Chaque body : 70 mots max. actions : 2 à 5 actions courtes, chacune avec un verbe.

Structure JSON exacte :
{ "title": string, "summary": string, "sections": [{ "heading": string, "body": string }], "actions": [string] }
Réponds uniquement par le JSON.`;
  const out = await gen(prompt, assistantOutput, "heavy", () => mockAssistant(task));
  return { status: 200, body: { ok: true, data: out } };
}
