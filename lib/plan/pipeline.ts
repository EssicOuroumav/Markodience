import type { Brief } from "./brief";
import { groupMonths, type Month, type Phase, type Week } from "./calendar";
import { allText, reportDelays, type Check, type PlanForChecks } from "./quality";
import { identityRun, kpiRun, networkRun, organicRun, pillarsRun, reviewRun, rulesRun, themesRun, weeksOf, type Draft, type Gen } from "./stages";
import * as S from "./schemas";

export type { Gen } from "./stages";

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

export { normalizePillars } from "./stages";

const fill = (text: string, theme: string) => text.replaceAll("{theme}", theme.replace(/[.\s]+$/, "").toLowerCase());

/** Déroule les modèles d'un réseau sur une semaine : le thème de la semaine est injecté dans chaque ligne. */
export function rowsFor(week: { phase: Phase; theme: string }, templates: S.TemplatesStage): PlanRow[] {
  return templates[week.phase].map((r) => ({ ...r, idea: fill(r.idea, week.theme), hook: fill(r.hook, week.theme).replace(/^./, (c) => c.toUpperCase()) }));
}

type State = Draft;

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
  const identity = await identityRun(brief, gen);
  onStage("piliers");
  const pillars = await pillarsRun(brief, identity, gen);
  onStage("calendrier");
  const weeks = weeksOf(brief);
  const themes = await themesRun(brief, pillars, gen);

  const networks: Draft["networks"] = [];
  for (const [i, n] of brief.networks.entries()) {
    onStage(`réseau ${n.name}`);
    networks[i] = await networkRun(brief, n.name, { identity, pillars, others: networks.filter((_, k) => k !== i) }, gen);
  }
  onStage("organique");
  const organic = await organicRun(brief, pillars, identity, gen);
  onStage("indicateurs");
  const kpi = await kpiRun(brief, identity, networks, gen);
  onStage("règles");
  const rules = await rulesRun(brief, identity, gen);

  const state: State = { identity, pillars, themes, networks, organic, kpi, rules };
  onStage("relecture critique");
  const first = await reviewRun(brief, state, gen);
  let { checks, critique } = first;
  const repaired: string[] = [];
  let unresolved: S.CritiqueStage["issues"] = [];

  if (repairEnabled) {
    const { feedback, unresolved: un } = feedbackByTarget(checks, critique, state);
    unresolved = un;
    const text = (key: string) => feedback.get(key)?.join("\n");
    if (text("themes")) { onStage("correction : thèmes"); state.themes = await themesRun(brief, pillars, gen, text("themes")); repaired.push("themes"); }
    for (const [i, n] of brief.networks.entries()) {
      const fb = { network: text(`network:${n.name}`), templates: text(`templates:${n.name}`) };
      if (fb.network || fb.templates) { onStage(`correction : ${n.name}`); state.networks[i] = await networkRun(brief, n.name, { identity, pillars, others: state.networks.filter((_, k) => k !== i) }, gen, fb); repaired.push(`network:${n.name}`); }
    }
    if (text("organic")) { onStage("correction : organique"); state.organic = await organicRun(brief, pillars, identity, gen, text("organic")); repaired.push("organic"); }
    if (text("kpi")) { onStage("correction : indicateurs"); state.kpi = await kpiRun(brief, identity, state.networks, gen, text("kpi")); repaired.push("kpi"); }
    if (text("rules")) { onStage("correction : règles"); state.rules = await rulesRun(brief, identity, gen, text("rules")); repaired.push("rules"); }
    if (repaired.length) {
      onStage("seconde relecture");
      ({ checks, critique } = await reviewRun(brief, state, gen));
    }
  }

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
