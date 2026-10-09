import type { ZodType } from "zod";
import type { Brief } from "./brief";
import { buildWeeks, groupMonths, type Month, type Phase, type Week } from "./calendar";
import * as P from "./prompts";
import * as S from "./schemas";

export type Gen = <T>(prompt: string, schema: ZodType<T>, tier?: "light" | "heavy") => Promise<T>;

export type PlanRow = { day: string; pillar: string; format: string; idea: string; hook: string };
export type WeekPlan = Week & { theme: string; pillar: string; rows: Record<string, PlanRow[]> };
export type Plan = {
  brief: Brief;
  identity: S.IdentityStage;
  pillars: S.PillarsStage;
  months: (Omit<Month, "weeks"> & { weeks: WeekPlan[] })[];
  networks: { profile: S.NetworkStage; templates: S.TemplatesStage }[];
  organic: S.OrganicStage;
  kpi: S.KpiStage;
  rules: S.RulesStage;
  critique: S.CritiqueStage;
};

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

const fill = (text: string, theme: string) => text.replaceAll("{theme}", theme.replace(/[.\s]+$/, "").toLowerCase());

/** Déroule les modèles d'un réseau sur une semaine : le thème de la semaine est injecté dans chaque ligne. */
export function rowsFor(week: { phase: Phase; theme: string }, templates: S.TemplatesStage): PlanRow[] {
  return templates[week.phase].map((r) => ({ ...r, idea: fill(r.idea, week.theme), hook: fill(r.hook, week.theme).replace(/^./, (c) => c.toUpperCase()) }));
}

export async function runPlan(brief: Brief, gen: Gen, onStage: (name: string) => void = () => undefined): Promise<Plan> {
  onStage("identité");
  const identity = await gen(P.identityPrompt(brief), S.identityStage, "heavy");

  onStage("piliers");
  const pillars = normalizePillars(await gen(P.pillarsPrompt(brief, identity), S.pillarsStage, "heavy"));

  onStage("calendrier");
  const weeks = buildWeeks(brief.plan_start, brief.weeks, brief.activities, brief.country);
  const themesOut = await gen(P.themesPrompt(brief, weeks, pillars), S.themesStage, "heavy");
  const themeOf = new Map(themesOut.themes.map((t) => [t.week, t]));
  const planned: WeekPlan[] = weeks.map((w) => ({ ...w, theme: themeOf.get(w.index)?.theme ?? "[thème à définir]", pillar: themeOf.get(w.index)?.pillar ?? "", rows: {} }));

  const networks: Plan["networks"] = [];
  for (const n of brief.networks) {
    onStage(`réseau ${n.name}`);
    const profile = await gen(P.networkPrompt(brief, n.name, identity, pillars), S.networkStage, "heavy");
    const templates = await gen(P.templatesPrompt(brief, n.name, { frequency: profile.frequency, method: profile.method }, pillars), S.templatesStage, "heavy");
    networks.push({ profile, templates });
    for (const w of planned) w.rows[n.name] = rowsFor(w, templates);
  }

  onStage("organique");
  const organic = await gen(P.organicPrompt(brief, pillars), S.organicStage, "heavy");
  onStage("indicateurs");
  const kpi = await gen(P.kpiPrompt(brief), S.kpiStage, "heavy");
  onStage("règles");
  const rules = await gen(P.rulesPrompt(brief), S.rulesStage, "heavy");

  const months = groupMonths(weeks).map((m) => ({ ...m, weeks: planned.filter((w) => w.month === m.month) }));
  const partial = { identity, pillars, networks, organic, kpi, rules, themes: planned.map((w) => ({ week: w.index, phase: w.phase, campaign: w.campaign, theme: w.theme, pillar: w.pillar })) };
  onStage("relecture critique");
  const critique = await gen(P.critiquePrompt(brief, partial), S.critiqueStage, "heavy");

  return { brief, identity, pillars, months, networks, organic, kpi, rules, critique };
}
