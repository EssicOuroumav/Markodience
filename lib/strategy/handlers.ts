import type { SupabaseClient } from "@supabase/supabase-js";
import { parseFoundations } from "../identity";
import { normalizeObjectives } from "../objectives";
import { readBrandInfo } from "../brandInfo";
import type { Gen } from "../plan/stages";
import { matchObjective, normalizePct } from "./evaluate";
import { mockIdeas, mockPersonas, mockPillarsStrategy } from "./mock";
import { ideasPrompt, personasPrompt, pillarsStrategyPrompt, type StrategyContext } from "./prompts";
import { ideasOutput, personasOutput, pillarsStrategyOutput, type Diagnostic, type PillarsBrief } from "./schemas";

export type StrategyResult = { status: number; body: Record<string, unknown> };
const fail = (status: number, error: string, code: string): StrategyResult => ({ status, body: { ok: false, code, error } });
const ok = (data: unknown): StrategyResult => ({ status: 200, body: { ok: true, data } });

/** Tout ce que l'IA doit savoir de la marque pour la stratégie : fiche, identité, objectifs, publics, piliers. */
export async function loadStrategyContext(supabase: SupabaseClient, brandId: string): Promise<StrategyContext | null> {
  const [{ data: brand }, { data: identity }, { data: personas }, { data: pillars }] = await Promise.all([
    supabase.from("brand_profiles").select("name, sector, status, about, website, socials, links").eq("id", brandId).maybeSingle(),
    supabase.from("brand_identity").select("positioning, foundations, target_segments, marketing_objectives, questionnaire").eq("brand_profile_id", brandId).maybeSingle(),
    supabase.from("personas").select("id, name, needs, frictions, tone").eq("brand_profile_id", brandId).order("position"),
    supabase.from("content_pillars").select("id, name, subthemes, cta, examples, persona_ids").eq("brand_profile_id", brandId),
  ]);
  if (!brand) return null;
  const info = readBrandInfo(brand);
  const foundations = parseFoundations(identity?.foundations);
  const q = (identity?.questionnaire ?? {}) as { problem?: string; differentiation?: string; avoid?: string; channels?: string[] };
  return {
    brand: { name: brand.name, sector: brand.sector, status: brand.status, about: info.about, networks: Object.keys(info.socials).length ? Object.keys(info.socials) : (q.channels ?? []) },
    identity: {
      positioning: identity?.positioning ?? null,
      mission: foundations?.mission ?? null,
      values: foundations?.values.map((v) => v.name) ?? [],
      segments: identity?.target_segments ?? null,
      objectives: normalizeObjectives(identity?.marketing_objectives).map((o) => o.text),
      problem: q.problem ?? null,
      differentiation: q.differentiation ?? null,
      avoid: q.avoid ?? null,
    },
    personas: (personas ?? []) as StrategyContext["personas"],
    pillars: (pillars ?? []).map((p) => ({ id: p.id, name: p.name, subthemes: p.subthemes, cta: p.cta, formats: p.examples, persona_ids: p.persona_ids })),
  };
}

const needIdentity = (c: StrategyContext) => (c.identity.positioning ? null : fail(409, "Définissez d'abord l'identité de la marque.", "identity_missing"));

export async function handlePersonas(supabase: SupabaseClient, brandId: string, gen: Gen): Promise<StrategyResult> {
  const ctx = await loadStrategyContext(supabase, brandId);
  if (!ctx) return fail(404, "Profil de marque introuvable.", "not_found");
  const missing = needIdentity(ctx);
  if (missing) return missing;
  const out = await gen(personasPrompt(ctx), personasOutput, "heavy", () => mockPersonas(ctx));
  // Les anciens publics sont remplacés ; les piliers qui y renvoyaient sont détachés.
  if ((await supabase.from("personas").delete().eq("brand_profile_id", brandId)).error) return fail(500, "Les anciens publics n'ont pas pu être remplacés.", "db");
  await supabase.from("content_pillars").update({ persona_ids: [] }).eq("brand_profile_id", brandId);
  const rows = out.personas.map((p, i) => ({ brand_profile_id: brandId, name: p.name, profile: p.profile, needs: p.needs, frictions: p.frictions, tone: p.tone, levers: p.levers, channels: p.channels, priority: i === 0 ? "principal" : p.priority, position: i }));
  const { error } = await supabase.from("personas").insert(rows);
  if (error) return fail(500, "Les publics n'ont pas pu être enregistrés.", "db");
  return ok({ count: rows.length });
}

export async function handlePillars(supabase: SupabaseClient, brandId: string, brief: PillarsBrief, gen: Gen): Promise<StrategyResult> {
  const ctx = await loadStrategyContext(supabase, brandId);
  if (!ctx) return fail(404, "Profil de marque introuvable.", "not_found");
  const missing = needIdentity(ctx);
  if (missing) return missing;
  const out = await gen(pillarsStrategyPrompt(ctx, brief), pillarsStrategyOutput, "heavy", () => mockPillarsStrategy(ctx, brief));
  const pillars = normalizePct(out.pillars);
  const byName = new Map(ctx.personas.map((p) => [p.name.trim().toLowerCase(), p.id]));
  const rows = pillars.map((p) => ({
    brand_profile_id: brandId,
    name: p.name,
    description: p.rationale,
    examples: p.formats,
    pct: p.pct,
    role: p.role,
    objective: matchObjective(p.objective, ctx.identity.objectives),
    persona_ids: p.personas.flatMap((n) => { const id = byName.get(n.trim().toLowerCase()); return id ? [id] : []; }),
    subthemes: p.subthemes,
    cta: p.cta,
    kpi: p.kpi,
    rationale: p.rationale,
    status: "hypothese",
  }));
  if ((await supabase.from("content_pillars").delete().eq("brand_profile_id", brandId)).error) return fail(500, "Les anciens piliers n'ont pas pu être remplacés.", "db");
  const { error } = await supabase.from("content_pillars").insert(rows);
  if (error) return fail(500, "Les piliers n'ont pas pu être enregistrés.", "db");
  const diagnostic: Diagnostic = { ...out.diagnostic, priority_objective: matchObjective(out.diagnostic.priority_objective, ctx.identity.objectives), input: brief };
  const { error: dErr } = await supabase.from("brand_identity").update({ diagnostic }).eq("brand_profile_id", brandId);
  if (dErr) return fail(500, "Le diagnostic n'a pas pu être enregistré.", "db");
  return ok({ count: rows.length });
}

export async function handleIdeas(supabase: SupabaseClient, brandId: string, pillarId: string, count: number, gen: Gen): Promise<StrategyResult> {
  const ctx = await loadStrategyContext(supabase, brandId);
  if (!ctx) return fail(404, "Profil de marque introuvable.", "not_found");
  const { data: pillar } = await supabase.from("content_pillars").select("id, name, subthemes, cta, examples, objective, persona_ids").eq("id", pillarId).eq("brand_profile_id", brandId).maybeSingle();
  if (!pillar) return fail(404, "Pilier introuvable.", "not_found");
  const { data: existing } = await supabase.from("content_ideas").select("title").eq("brand_profile_id", brandId).order("created_at", { ascending: false }).limit(60);
  const names = ctx.personas.filter((p) => (pillar.persona_ids ?? []).includes(p.id)).map((p) => p.name);
  const out = await gen(
    ideasPrompt(ctx, { name: pillar.name, subthemes: pillar.subthemes, cta: pillar.cta, formats: pillar.examples, objective: pillar.objective }, names, count, (existing ?? []).map((e) => e.title)),
    ideasOutput, "heavy", () => mockIdeas(count, ctx.brand.networks),
  );
  const rows = out.ideas.slice(0, count).map((i) => ({ brand_profile_id: brandId, pillar_id: pillarId, title: i.title, notes: i.angle, source: "ia", subtheme: i.subtheme || null, format: i.format || null, networks: i.networks, status: "a_trier" }));
  const { error } = await supabase.from("content_ideas").insert(rows);
  if (error) return fail(500, "Les idées n'ont pas pu être enregistrées.", "db");
  return ok({ count: rows.length });
}
