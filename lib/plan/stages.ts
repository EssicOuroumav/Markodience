import type { ZodType } from "zod";
import { assignPillars } from "./assign";
import { briefContext, type Brief } from "./brief";
import { applyRewrites, collectOver, condensePrompt, condenseSchema } from "./brevity";
import { buildWeeks, type Week } from "./calendar";
import * as M from "./mock";
import { baseFor, weekdaysIn } from "./networks";
import * as P from "./prompts";
import { runChecks, type Check, type PlanForChecks } from "./quality";
import * as S from "./schemas";

/** Appel à l'IA : prompt, schéma de la réponse, palier de modèle et réponse simulée (AI_MOCK=1). */
export type Gen = <T>(prompt: string, schema: ZodType<T>, tier?: "light" | "heavy", mock?: () => T) => Promise<T>;

/** Réécrit en une passe, plus courte, les textes qui dépassent leur limite (deux passes au plus). */
export async function tighten<T>(gen: Gen, stage: string, value: T): Promise<T> {
  let current = value;
  for (let pass = 0; pass < 2; pass++) {
    const over = collectOver(stage, current);
    if (over.length === 0) break;
    const out = await gen(condensePrompt(over), condenseSchema, P.condenseModel, () => M.mockCondense(over));
    current = applyRewrites(current, over, out.texts);
  }
  return current;
}

/** Ramène la somme des pourcentages à 100 (le plus gros pilier absorbe l'écart) : le total est une règle, pas une suggestion. */
export function normalizePillars(p: S.PillarsStage): S.PillarsStage {
  const total = S.pillarsTotal(p);
  if (total === 100) return p;
  const pillars = p.pillars.map((x) => ({ ...x, pct: Math.max(3, Math.round((x.pct / total) * 100)) }));
  const diff = 100 - pillars.reduce((n, x) => n + x.pct, 0);
  const biggest = pillars.reduce((bi, x, i) => (x.pct > pillars[bi].pct ? i : bi), 0);
  pillars[biggest] = { ...pillars[biggest], pct: pillars[biggest].pct + diff };
  return { pillars };
}

export async function identityRun(brief: Brief, gen: Gen, feedback?: string): Promise<S.IdentityStage> {
  const raw = await tighten(gen, "identity", await gen(P.identityPrompt(brief, feedback), S.identityStage, "heavy", () => M.mockIdentityStage(brief)));
  // Le code a le dernier mot sur ce que la marque impose déjà.
  return { ...raw, commitments: { ...raw.commitments, ...brief.commitments }, ...(brief.tagline ? { tagline: brief.tagline, tagline_status: "fourni" as const } : {}) };
}

export async function pillarsRun(brief: Brief, identity: S.IdentityStage, gen: Gen, feedback?: string): Promise<S.PillarsStage> {
  return normalizePillars(await tighten(gen, "pillars", await gen(P.pillarsPrompt(brief, identity, feedback), S.pillarsStage, "heavy", M.mockPillarsStage)));
}

export type ThemeRow = { week: number; theme: string; pillar: string };

export const weeksOf = (brief: Brief): Week[] => buildWeeks(brief.plan_start, brief.weeks, brief.activities, brief.country, briefContext(brief));

/** Le code attribue le pilier de chaque semaine (pourcentages respectés) ; l'IA n'écrit que le thème. */
export async function themesRun(brief: Brief, pillars: S.PillarsStage, gen: Gen, feedback?: string): Promise<ThemeRow[]> {
  const weeks = weeksOf(brief);
  const assigned = assignPillars(weeks.map((w) => w.phase), pillars.pillars);
  const out = await tighten(gen, "themes", await gen(P.themesPrompt(brief, weeks, pillars, assigned, feedback), S.themesStage, "heavy", () => M.mockThemesStage(weeks)));
  return weeks.map((w) => ({ week: w.index, theme: out.themes.find((t) => t.week === w.index)?.theme ?? "[thème à définir]", pillar: assigned[w.index - 1] }));
}

export type NetworkResult = { profile: S.NetworkStage; templates: S.TemplatesStage };
export const PHASES = ["avant", "pendant", "apres", "evergreen"] as const;
export const daysOfTemplates = (t: S.TemplatesStage) => [...new Set(PHASES.flatMap((ph) => t[ph].flatMap((r) => weekdaysIn(r.day))))];

/** Un réseau : sa fiche (cadence, format, règles) puis ses modèles de posts par phase. Les jours des autres réseaux sont évités. */
export async function networkRun(brief: Brief, name: string, ctx: { identity: S.IdentityStage; pillars: S.PillarsStage; others: NetworkResult[] }, gen: Gen, feedback?: { network?: string; templates?: string }): Promise<NetworkResult> {
  const takenDays = [...new Set(ctx.others.flatMap((n) => daysOfTemplates(n.templates)))];
  const otherIdeas = ctx.others.flatMap((n) => n.templates.pendant.map((r) => `${n.profile.network} : ${r.idea}`)).slice(0, 8);
  // Jours conseillés pour ce réseau : d'abord ceux qui ne sont pas pris ; à défaut on complète avec ses jours habituels (un recoupement partiel est acceptable).
  const base = baseFor(name).days;
  const days = [...new Set([...base.filter((d) => !takenDays.includes(d)), ...base, "Mardi", "Jeudi", "Samedi", "Lundi", "Mercredi", "Vendredi", "Dimanche"])].slice(0, Math.max(base.length, 3));
  const profile = await tighten(gen, "network", await gen(P.networkPrompt(brief, name, ctx.identity, ctx.pillars, takenDays, feedback?.network), S.networkStage, "heavy", () => M.mockNetworkStage(name, days)));
  const titles = ctx.pillars.pillars.map((p) => p.title);
  const templates = await tighten(gen, "templates", await gen(P.templatesPrompt(brief, name, { frequency: profile.frequency, method: profile.method }, ctx.pillars, ctx.identity, otherIdeas, feedback?.templates), S.templatesStage, "heavy", () => M.mockTemplatesStage(name, days, titles)));
  return { profile, templates };
}

export const cadencesOf = (networks: NetworkResult[]) => networks.map((n) => `${n.profile.network} : ${n.profile.frequency}`);

export async function organicRun(brief: Brief, pillars: S.PillarsStage, identity: S.IdentityStage, gen: Gen, feedback?: string) {
  return tighten(gen, "organic", await gen(P.organicPrompt(brief, pillars, identity, feedback), S.organicStage, "heavy", M.mockOrganicStage));
}
export async function kpiRun(brief: Brief, identity: S.IdentityStage, networks: NetworkResult[], gen: Gen, feedback?: string) {
  return tighten(gen, "kpi", await gen(P.kpiPrompt(brief, identity, cadencesOf(networks), feedback), S.kpiStage, "heavy", () => M.mockKpiStage(brief)));
}
export async function rulesRun(brief: Brief, identity: S.IdentityStage, gen: Gen, feedback?: string) {
  return tighten(gen, "rules", await gen(P.rulesPrompt(brief, identity, feedback), S.rulesStage, "heavy", M.mockRulesStage));
}

export type Draft = {
  identity: S.IdentityStage;
  pillars: S.PillarsStage;
  themes: ThemeRow[];
  networks: NetworkResult[];
  organic: S.OrganicStage;
  kpi: S.KpiStage;
  rules: S.RulesStage;
};
export const forChecks = (d: Draft): PlanForChecks => ({ ...d });

export function workload(brief: Brief, d: Draft): string {
  const per = d.networks.map((n) => `${n.profile.network} ${n.templates.evergreen.length}`);
  const total = d.networks.reduce((sum, n) => sum + n.templates.evergreen.length, 0);
  return `${total} publications par semaine en période calme (${per.join(", ")}), pour : ${brief.resources.team || "équipe non précisée"}.`;
}

/** Contrôles du code, puis relecture critique (gravité, risques, questions de suivi). */
export async function reviewRun(brief: Brief, d: Draft, gen: Gen): Promise<{ checks: Check[]; critique: S.CritiqueStage }> {
  const checks = runChecks(forChecks(d));
  const critique = await gen(P.critiquePrompt(brief, { ...forChecks(d), networks: d.networks }, checks, workload(brief, d)), S.critiqueStage, "heavy", M.mockCritiqueStage);
  return { checks, critique };
}
