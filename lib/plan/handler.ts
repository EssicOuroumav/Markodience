import type { SupabaseClient } from "@supabase/supabase-js";
import { briefSchema, type Brief } from "./brief";
import { extractPrompt, extractStage, toBriefDraft } from "./extract";
import { rateLimit } from "../rateLimit";
import { mockExtract } from "./mock";
import { MAX_STAGE_RUNS, buildSteps, completedStages, draftNetworks, planToRows, type PlanStage, type StoredDraft } from "./store";
import { identityRun, kpiRun, networkRun, organicRun, pillarsRun, reviewRun, rulesRun, themesRun, weeksOf, type Draft, type Gen } from "./stages";

export type HandlerResult = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string, code = "error"): HandlerResult => ({ status, body: { ok: false, code, error } });
const ok = (data: unknown): HandlerResult => ({ status: 200, body: { ok: true, data } });

export type PlanRequest =
  | { type: "plan_extract"; brand_profile_id: string; text: string }
  | { type: "plan_stage"; brand_profile_id: string; stage: PlanStage; network?: string; brief?: Brief };

/** Ce qui doit être refait quand une étape est relancée : tout ce qui en dépend. */
const DOWNSTREAM: Record<string, (keyof StoredDraft)[]> = {
  identity: ["pillars", "themes", "networks", "organic", "kpi", "rules", "checks", "critique"],
  pillars: ["themes", "networks", "organic", "kpi", "rules", "checks", "critique"],
  calendar: ["networks", "kpi", "checks", "critique"],
  network: ["kpi", "checks", "critique"],
  organic: ["checks", "critique"],
  kpi: ["checks", "critique"],
  rules: ["checks", "critique"],
};

const needs = (d: StoredDraft, ...keys: (keyof StoredDraft)[]) => keys.every((k) => d[k]);

async function loadDraft(supabase: SupabaseClient, brandId: string): Promise<StoredDraft | null> {
  const { data } = await supabase.from("brand_strategy").select("draft").eq("brand_profile_id", brandId).maybeSingle();
  return (data?.draft as StoredDraft | null) ?? null;
}

async function saveDraft(supabase: SupabaseClient, brandId: string, draft: StoredDraft, extra: Record<string, unknown> = {}) {
  return supabase.from("brand_strategy").upsert({ brand_profile_id: brandId, brief: draft.brief, draft, updated_at: new Date().toISOString(), ...extra }, { onConflict: "brand_profile_id" });
}

/** Vérifications de fond sur le cahier des charges validé par l'utilisateur (le schéma ne contrôle que la forme). */
export function validateBrief(b: Brief): string | null {
  const names = b.networks.map((n) => n.name.toLowerCase());
  if (new Set(names).size !== names.length) return "Un réseau est cité deux fois.";
  for (const a of b.activities) {
    if (a.end < a.start) return `L'activité « ${a.name} » se termine avant son début.`;
  }
  const start = Date.parse(b.plan_start + "T00:00:00Z");
  if (new Date(start).getUTCDay() !== 1) return "Le plan doit commencer un lundi.";
  return null;
}

export async function handlePlan(supabase: SupabaseClient, req: PlanRequest, gen: Gen, today = new Date().toISOString().slice(0, 10)): Promise<HandlerResult> {
  const { data: brand } = await supabase.from("brand_profiles").select("id").eq("id", req.brand_profile_id).maybeSingle();
  if (!brand) return fail(404, "Profil de marque introuvable.", "not_found");

  if (req.type === "plan_extract") {
    const extract = await gen(extractPrompt(req.text, today), extractStage, "heavy", () => mockExtract(req.text));
    return ok({ extract, brief: toBriefDraft(extract, today) });
  }

  const brandId = req.brand_profile_id;

  if (req.stage === "start") {
    const parsed = briefSchema.safeParse(req.brief);
    if (!parsed.success) return fail(400, "Le cahier des charges est incomplet : vérifiez les champs signalés.", "bad_brief");
    const problem = validateBrief(parsed.data);
    if (problem) return fail(400, problem, "bad_brief");
    const draft: StoredDraft = { brief: parsed.data, stage_runs: {}, started_at: new Date().toISOString() };
    const { error } = await saveDraft(supabase, brandId, draft);
    if (error) return fail(500, "Le plan n'a pas pu être préparé.", "db");
    return ok({ steps: buildSteps(parsed.data) });
  }

  const draft = await loadDraft(supabase, brandId);
  if (!draft) return fail(409, "Commencez par préparer le plan.", "no_draft");
  const brief = draft.brief;
  const key = req.stage === "network" ? `network:${req.network ?? ""}` : req.stage;
  if (req.stage !== "apply" && (draft.stage_runs[key] ?? 0) >= MAX_STAGE_RUNS) return fail(409, "Cette étape a déjà été relancée deux fois pour ce plan. Recommencez un nouveau plan pour la refaire.", "stage_limit");
  // Le compteur ci-dessus n'avance qu'une fois l'étape terminée : des demandes simultanées passent toutes le contrôle avant qu'il bouge (12 demandes = 12 générations,
  // mesuré par `handler.race.test.ts`). Ce plafond partagé et atomique, par plan et par étape, borne le coût ; il est large (3 fois le plafond) pour ne pas gêner les nouveaux essais après un échec.
  if (req.stage !== "apply" && !(await rateLimit(`plan-stage:${brandId}:${draft.started_at}:${key}`, MAX_STAGE_RUNS * 3, 86_400))) return fail(429, "Cette étape a été lancée trop de fois pour ce plan. Recommencez un nouveau plan pour la refaire.", "rate_limited");

  const done = async (patch: Partial<StoredDraft>, resetFor?: string): Promise<HandlerResult> => {
    const next: StoredDraft = { ...draft, ...patch, stage_runs: { ...draft.stage_runs, [key]: (draft.stage_runs[key] ?? 0) + 1 } };
    for (const k of DOWNSTREAM[resetFor ?? req.stage] ?? []) delete next[k];
    const { error } = await saveDraft(supabase, brandId, next);
    return error ? fail(500, "L'étape n'a pas pu être enregistrée.", "db") : ok({ completed: completedStages(next) });
  };

  switch (req.stage) {
    case "identity":
      return done({ identity: await identityRun(brief, gen) });
    case "pillars":
      if (!needs(draft, "identity")) return fail(409, "Générez d'abord l'identité.", "order");
      return done({ pillars: await pillarsRun(brief, draft.identity!, gen) });
    case "calendar":
      if (!needs(draft, "pillars")) return fail(409, "Générez d'abord les piliers.", "order");
      return done({ themes: await themesRun(brief, draft.pillars!, gen) });
    case "network": {
      if (!needs(draft, "identity", "pillars")) return fail(409, "Générez d'abord l'identité et les piliers.", "order");
      const name = req.network;
      if (!name || !brief.networks.some((n) => n.name === name)) return fail(400, "Réseau inconnu.", "bad_network");
      const others = draftNetworks({ ...draft, networks: Object.fromEntries(Object.entries(draft.networks ?? {}).filter(([k]) => k !== name)) }, brief);
      const result = await networkRun(brief, name, { identity: draft.identity!, pillars: draft.pillars!, others }, gen);
      return done({ networks: { ...(draft.networks ?? {}), [name]: result } });
    }
    case "organic":
      if (!needs(draft, "identity", "pillars")) return fail(409, "Générez d'abord l'identité et les piliers.", "order");
      return done({ organic: await organicRun(brief, draft.pillars!, draft.identity!, gen) });
    case "kpi":
      if (!needs(draft, "identity") || draftNetworks(draft, brief).length !== brief.networks.length) return fail(409, "Générez d'abord les lignes éditoriales de chaque réseau.", "order");
      return done({ kpi: await kpiRun(brief, draft.identity!, draftNetworks(draft, brief), gen) });
    case "rules":
      if (!needs(draft, "identity")) return fail(409, "Générez d'abord l'identité.", "order");
      return done({ rules: await rulesRun(brief, draft.identity!, gen) });
    case "review": {
      const full = asDraft(draft);
      if (!full) return fail(409, "Toutes les étapes précédentes doivent être terminées.", "order");
      const { checks, critique } = await reviewRun(brief, full, gen);
      return done({ checks, critique });
    }
    case "apply": {
      const full = asDraft(draft);
      if (!full || !draft.critique) return fail(409, "Terminez d'abord la relecture.", "order");
      return applyPlan(supabase, brandId, brief, full, draft);
    }
  }
}

function asDraft(d: StoredDraft): Draft | null {
  const networks = draftNetworks(d, d.brief);
  if (!d.identity || !d.pillars || !d.themes || !d.organic || !d.kpi || !d.rules || networks.length !== d.brief.networks.length) return null;
  return { identity: d.identity, pillars: d.pillars, themes: d.themes, networks, organic: d.organic, kpi: d.kpi, rules: d.rules };
}

const chunk = <T,>(xs: T[], n: number) => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n));

/** Écrit le plan dans les onglets (identité, piliers, tonalité, lignes éditoriales, publications prévues) et la fiche stratégie. */
async function applyPlan(supabase: SupabaseClient, brandId: string, brief: Brief, d: Draft, stored: StoredDraft): Promise<HandlerResult> {
  const weeks = weeksOf(brief);
  const rows = planToRows(brief, d, weeks);
  const fail500 = (what: string) => fail(500, `La mise en place a échoué (${what}). Relancez cette étape : elle peut être répétée sans risque.`, "db");

  const { data: existing } = await supabase.from("brand_identity").select("target_segments").eq("brand_profile_id", brandId).maybeSingle();
  const hasSegments = Array.isArray(existing?.target_segments) && (existing?.target_segments as unknown[]).length > 0;
  const identity = { brand_profile_id: brandId, ...rows.identity, ...(hasSegments ? {} : { target_segments: brief.audiences.map((a) => ({ name: a.name, description: a.description, need: "" })) }) };
  if ((await supabase.from("brand_identity").upsert(identity, { onConflict: "brand_profile_id" })).error) return fail500("identité");

  if ((await supabase.from("content_pillars").delete().eq("brand_profile_id", brandId)).error) return fail500("piliers");
  if ((await supabase.from("content_pillars").insert(rows.pillars.map((p) => ({ brand_profile_id: brandId, ...p })))).error) return fail500("piliers");
  if ((await supabase.from("tone_voice").upsert({ brand_profile_id: brandId, ...rows.tone }, { onConflict: "brand_profile_id" })).error) return fail500("tonalité");

  // Les anciennes lignes prévues du plan (brouillons non rédigés) sont remplacées ; les publications rédigées ou publiées restent.
  if ((await supabase.from("posts").delete().eq("brand_profile_id", brandId).eq("status", "brouillon").neq("idea", "")).error) return fail500("publications");

  let postCount = 0;
  for (const line of rows.lines) {
    if ((await supabase.from("editorial_lines").delete().eq("brand_profile_id", brandId).eq("channel", line.channel)).error) return fail500(line.channel);
    const { data: created, error } = await supabase.from("editorial_lines").insert({ brand_profile_id: brandId, channel: line.channel, period_start: line.period_start, period_end: line.period_end }).select("id").single();
    if (error || !created) return fail500(line.channel);
    const { data: entries, error: eErr } = await supabase.from("editorial_entries").insert(line.entries.map((e) => ({ editorial_line_id: created.id, ...e }))).select("id, week_number");
    if (eErr || !entries) return fail500(line.channel);
    const entryOf = new Map(entries.map((e) => [e.week_number as number, e.id as string]));
    for (const part of chunk(line.posts, 150)) {
      const { error: pErr } = await supabase.from("posts").insert(part.map(({ week_number, ...p }) => ({ brand_profile_id: brandId, editorial_entry_id: entryOf.get(week_number) ?? null, caption: "", status: "brouillon", ...p })));
      if (pErr) return fail500(`publications ${line.channel}`);
    }
    postCount += line.posts.length;
  }

  const networks = Object.fromEntries(d.networks.map((n) => [n.profile.network, n]));
  const { error } = await supabase.from("brand_strategy").upsert(
    { brand_profile_id: brandId, brief, networks, organic: d.organic, organic_done: [], kpi_plan: d.kpi, rules: d.rules, critique: stored.critique, checks: stored.checks, built_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { onConflict: "brand_profile_id" },
  );
  if (error) return fail500("fiche stratégie");
  return ok({ weeks: weeks.length, posts: postCount, networks: d.networks.length });
}
