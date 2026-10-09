import type { ZodType } from "zod";
import { briefContext, type Brief } from "./brief";
import { applyRewrites, collectOver, condensePrompt, condenseSchema } from "./brevity";
import { assignPillars } from "./assign";
import { buildWeeks, groupMonths, type Month, type Phase, type Week } from "./calendar";
import { weekdaysIn } from "./networks";
import * as P from "./prompts";
import { allText, reportDelays, runChecks, type Check, type PlanForChecks } from "./quality";
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
  checks: Check[];
  critique: S.CritiqueStage;
  /** Première relecture, avant les corrections automatiques. */
  critiqueBefore: S.CritiqueStage;
  /** Étapes régénérées après la relecture. */
  repaired: string[];
  /** Problèmes de l'identité ou des piliers : jamais corrigés sans vous (ils changent tout le reste). */
  unresolved: S.CritiqueStage["issues"];
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

/** Réécrit en une passe, plus courte, les textes qui dépassent leur limite (deux passes au plus). */
export async function tighten<T>(gen: Gen, stage: string, value: T): Promise<T> {
  let current = value;
  for (let pass = 0; pass < 2; pass++) {
    const over = collectOver(stage, current);
    if (over.length === 0) break;
    const out = await gen(condensePrompt(over), condenseSchema, P.condenseModel);
    current = applyRewrites(current, over, out.texts);
  }
  return current;
}

const PHASES = ["avant", "pendant", "apres", "evergreen"] as const;
const daysOfTemplates = (t: S.TemplatesStage) => [...new Set(PHASES.flatMap((ph) => t[ph].flatMap((r) => weekdaysIn(r.day))))];

type State = {
  identity: S.IdentityStage;
  pillars: S.PillarsStage;
  themes: { week: number; theme: string; pillar: string }[];
  networks: { profile: S.NetworkStage; templates: S.TemplatesStage }[];
  organic: S.OrganicStage;
  kpi: S.KpiStage;
  rules: S.RulesStage;
};

const forChecks = (s: State): PlanForChecks => ({ ...s });

function workload(brief: Brief, s: State): string {
  const per = s.networks.map((n) => `${n.profile.network} ${n.templates.evergreen.length}`);
  const total = s.networks.reduce((sum, n) => sum + n.templates.evergreen.length, 0);
  return `${total} publications par semaine en période calme (${per.join(", ")}), pour : ${brief.resources.team || "équipe non précisée"}.`;
}

/** Retours à appliquer à chaque étape : échecs des contrôles du code + problèmes relevés par la relecture. */
export function feedbackByTarget(checks: Check[], critique: S.CritiqueStage, s: State): { feedback: Map<string, string[]>; unresolved: S.CritiqueStage["issues"] } {
  const feedback = new Map<string, string[]>();
  const add = (key: string, text: string) => feedback.set(key, [...(feedback.get(key) ?? []), text]);
  const unresolved: S.CritiqueStage["issues"] = [];

  for (const c of checks.filter((x) => !x.ok)) {
    if (c.id === "equilibre-piliers") add("themes", c.detail + " Rééquilibre les piliers des semaines concernées.");
    if (c.id.startsWith("cadence-") && c.network) add(`network:${c.network}`, c.detail + " Choisis d'autres jours de publication.");
    if (c.id.startsWith("cadence-") && c.network) add(`templates:${c.network}`, c.detail + " Utilise d'autres jours, sans en réutiliser un autre réseau.");
    if (c.id === "idees-differentes") for (const n of s.networks.slice(1)) add(`templates:${n.profile.network}`, c.detail + " Trouve un angle propre à ce réseau.");
    if (c.id === "delai-validation") add("rules", c.detail + " Reprends exactement les délais des engagements.");
    if (c.id === "delai-bilan") {
      const wanted = s.identity.commitments.report_days;
      const stages: [string, unknown][] = [["rules", s.rules], ["organic", s.organic], ["kpi", s.kpi], ...s.networks.flatMap((n): [string, unknown][] => [[`network:${n.profile.network}`, n.profile], [`templates:${n.profile.network}`, n.templates]])];
      for (const [key, value] of stages) if (reportDelays(allText({ rules: value } as unknown as PlanForChecks)).some((d) => d !== wanted)) add(key, `Le bilan de campagne est publié sous ${wanted} jours, partout. Corrige tout autre délai.`);
    }
  }

  for (const i of critique.issues.filter((x) => x.severity === "grave")) {
    const line = `- ${i.where} : ${i.problem} → ${i.fix}`;
    if (i.stage === "identity" || i.stage === "pillars" || i.stage === "general") unresolved.push(i);
    else if ((i.stage === "network" || i.stage === "templates") && i.network) add(`${i.stage}:${i.network}`, line);
    else if (i.stage === "network" || i.stage === "templates") for (const n of s.networks) add(`${i.stage}:${n.profile.network}`, line);
    else add(i.stage, line);
  }
  return { feedback, unresolved };
}

export async function runPlan(brief: Brief, gen: Gen, onStage: (name: string) => void = () => undefined, opts: { repair?: boolean } = {}): Promise<Plan> {
  const repairEnabled = opts.repair ?? true;

  onStage("identité");
  let identity = await tighten(gen, "identity", await gen(P.identityPrompt(brief), S.identityStage, "heavy"));
  // Le code a le dernier mot sur ce que la marque impose déjà.
  identity = { ...identity, commitments: { ...identity.commitments, ...brief.commitments }, ...(brief.tagline ? { tagline: brief.tagline, tagline_status: "fourni" as const } : {}) };

  onStage("piliers");
  const pillars = normalizePillars(await tighten(gen, "pillars", await gen(P.pillarsPrompt(brief, identity), S.pillarsStage, "heavy")));

  onStage("calendrier");
  const weeks = buildWeeks(brief.plan_start, brief.weeks, brief.activities, brief.country, briefContext(brief));
  // Le code attribue le pilier de chaque semaine (pourcentages respectés) ; l'IA n'écrit que le thème.
  const assigned = assignPillars(weeks.map((w) => w.phase), pillars.pillars);
  const makeThemes = async (feedback?: string) => {
    const out = await tighten(gen, "themes", await gen(P.themesPrompt(brief, weeks, pillars, assigned, feedback), S.themesStage, "heavy"));
    return out.themes.map((t) => ({ ...t, pillar: assigned[t.week - 1] ?? "" }));
  };
  let themes = await makeThemes();

  const state: State = { identity, pillars, themes, networks: [], organic: undefined as never, kpi: undefined as never, rules: undefined as never };

  const makeNetwork = async (name: string, i: number, feedback?: { network?: string; templates?: string }) => {
    const takenDays = state.networks.filter((_, k) => k !== i).flatMap((n) => daysOfTemplates(n.templates));
    const others = state.networks.filter((_, k) => k !== i).flatMap((n) => n.templates.pendant.map((r) => `${n.profile.network} : ${r.idea}`)).slice(0, 8);
    const profile = await tighten(gen, "network", await gen(P.networkPrompt(brief, name, identity, pillars, [...new Set(takenDays)], feedback?.network), S.networkStage, "heavy"));
    const templates = await tighten(gen, "templates", await gen(P.templatesPrompt(brief, name, { frequency: profile.frequency, method: profile.method }, pillars, identity, others, feedback?.templates), S.templatesStage, "heavy"));
    return { profile, templates };
  };
  for (const [i, n] of brief.networks.entries()) {
    onStage(`réseau ${n.name}`);
    state.networks[i] = await makeNetwork(n.name, i);
  }

  const cadences = () => state.networks.map((n) => `${n.profile.network} : ${n.profile.frequency}`);
  onStage("organique");
  state.organic = await tighten(gen, "organic", await gen(P.organicPrompt(brief, pillars, identity), S.organicStage, "heavy"));
  onStage("indicateurs");
  state.kpi = await tighten(gen, "kpi", await gen(P.kpiPrompt(brief, identity, cadences()), S.kpiStage, "heavy"));
  onStage("règles");
  state.rules = await tighten(gen, "rules", await gen(P.rulesPrompt(brief, identity), S.rulesStage, "heavy"));
  state.themes = themes;

  const review = async (s: State) => {
    const checks = runChecks(forChecks(s));
    const critique = await gen(P.critiquePrompt(brief, { ...forChecks(s), networks: s.networks }, checks, workload(brief, s)), S.critiqueStage, "heavy");
    return { checks, critique };
  };

  onStage("relecture critique");
  const first = await review(state);
  let { checks, critique } = first;
  const repaired: string[] = [];
  let unresolved: S.CritiqueStage["issues"] = [];

  if (repairEnabled) {
    const { feedback, unresolved: un } = feedbackByTarget(checks, critique, state);
    unresolved = un;
    const text = (key: string) => feedback.get(key)?.join("\n");
    if (text("themes")) { onStage("correction : thèmes"); themes = await makeThemes(text("themes")); state.themes = themes; repaired.push("themes"); }
    for (const [i, n] of brief.networks.entries()) {
      const fb = { network: text(`network:${n.name}`), templates: text(`templates:${n.name}`) };
      if (fb.network || fb.templates) { onStage(`correction : ${n.name}`); state.networks[i] = await makeNetwork(n.name, i, fb); repaired.push(`network:${n.name}`); }
    }
    if (text("organic")) { onStage("correction : organique"); state.organic = await tighten(gen, "organic", await gen(P.organicPrompt(brief, pillars, identity, text("organic")), S.organicStage, "heavy")); repaired.push("organic"); }
    if (text("kpi")) { onStage("correction : indicateurs"); state.kpi = await tighten(gen, "kpi", await gen(P.kpiPrompt(brief, identity, cadences(), text("kpi")), S.kpiStage, "heavy")); repaired.push("kpi"); }
    if (text("rules")) { onStage("correction : règles"); state.rules = await tighten(gen, "rules", await gen(P.rulesPrompt(brief, identity, text("rules")), S.rulesStage, "heavy")); repaired.push("rules"); }
    if (repaired.length) {
      onStage("seconde relecture");
      ({ checks, critique } = await review(state));
    }
  }

  // Assemblage final : le code déroule les modèles de chaque réseau sur les semaines.
  const themeOf = new Map(state.themes.map((t) => [t.week, t]));
  const planned: WeekPlan[] = weeks.map((w) => {
    const t = themeOf.get(w.index);
    const wp: WeekPlan = { ...w, theme: t?.theme ?? "[thème à définir]", pillar: t?.pillar ?? "", rows: {} };
    state.networks.forEach((n) => (wp.rows[n.profile.network] = rowsFor(wp, n.templates)));
    return wp;
  });
  const months = groupMonths(weeks).map((m) => ({ ...m, weeks: planned.filter((w) => w.month === m.month) }));

  return { brief, identity, pillars, months, networks: state.networks, organic: state.organic, kpi: state.kpi, rules: state.rules, checks, critique, critiqueBefore: first.critique, repaired, unresolved };
}
