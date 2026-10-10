import type { Diagnostic } from "./schemas";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

export type PillarForEval = { objective?: string | null; persona_ids?: string[] | null; subthemes?: string[] | null; kpi?: string | null };
export type EvalContext = { objectives: string[]; personaIds: Set<string>; ideaCount: number };
export type Question = { id: "objectif" | "besoin" | "contenus" | "mesure"; label: string; ok: boolean; detail: string };
export type Verdict = "solide" | "a_ameliorer" | "a_retravailler";

/** Remplace le pourcentage de chaque pilier pour que le total fasse 100 (le plus gros pilier absorbe l'écart). */
export function normalizePct<T extends { pct: number }>(pillars: T[]): T[] {
  const total = pillars.reduce((n, p) => n + p.pct, 0);
  if (total === 100 || pillars.length === 0) return pillars;
  const out = pillars.map((p) => ({ ...p, pct: Math.max(3, Math.round((p.pct / total) * 100)) }));
  const diff = 100 - out.reduce((n, p) => n + p.pct, 0);
  const big = out.reduce((bi, p, i) => (p.pct > out[bi].pct ? i : bi), 0);
  out[big] = { ...out[big], pct: out[big].pct + diff };
  return out;
}

/** L'objectif cité par l'IA est ramené à celui de la marque qui lui ressemble le plus (sinon laissé tel quel). */
export function matchObjective(candidate: string, objectives: string[]): string {
  if (objectives.length === 0) return candidate;
  const c = norm(candidate);
  const exact = objectives.find((o) => norm(o) === c);
  if (exact) return exact;
  const words = new Set(c.split(" ").filter((w) => w.length > 3));
  let best = { o: "", score: 0 };
  for (const o of objectives) {
    const ow = norm(o).split(" ").filter((w) => w.length > 3);
    const score = ow.filter((w) => words.has(w)).length / Math.max(ow.length, 1);
    if (score > best.score) best = { o, score };
  }
  return best.score >= 0.3 ? best.o : candidate;
}

/**
 * Le test des 4 questions, calculé à partir des données (jamais coché à la main) :
 * 1. contribue-t-il à un objectif réel ? 2. répond-il à un besoin identifiable du public ?
 * 3. peut-on produire plusieurs contenus ? 4. peut-on évaluer sa contribution aux résultats ?
 */
export function evaluatePillar(p: PillarForEval, ctx: EvalContext): { questions: Question[]; passed: number; verdict: Verdict } {
  const objective = (p.objective ?? "").trim();
  const linkedObjective = objective.length >= 3 && (ctx.objectives.length === 0 || ctx.objectives.some((o) => norm(o) === norm(objective)));
  const linkedPersonas = (p.persona_ids ?? []).filter((id) => ctx.personaIds.has(id)).length;
  const subthemes = (p.subthemes ?? []).filter((s) => s.trim()).length;
  const content = Math.max(subthemes, ctx.ideaCount);
  const kpi = (p.kpi ?? "").trim();
  const questions: Question[] = [
    { id: "objectif", label: "Contribue-t-il à un objectif réel ?", ok: linkedObjective, detail: linkedObjective ? `Relié à : « ${objective} »` : objective ? "Cet objectif n'est pas dans la liste de vos objectifs." : "Reliez-le à l'un de vos objectifs." },
    { id: "besoin", label: "Répond-il à un besoin du public ?", ok: linkedPersonas > 0, detail: linkedPersonas > 0 ? `${linkedPersonas} cible${linkedPersonas > 1 ? "s" : ""} concernée${linkedPersonas > 1 ? "s" : ""}` : "Choisissez la ou les cibles qu'il sert." },
    { id: "contenus", label: "Peut-on produire plusieurs contenus ?", ok: content >= 3, detail: content >= 3 ? `${subthemes} sous-thème${subthemes > 1 ? "s" : ""}, ${ctx.ideaCount} idée${ctx.ideaCount > 1 ? "s" : ""}` : "Il faut au moins 3 sous-thèmes ou idées." },
    { id: "mesure", label: "Peut-on évaluer sa contribution ?", ok: kpi.length >= 3, detail: kpi.length >= 3 ? `Indicateur : ${kpi}` : "Définissez l'indicateur qui le mesure." },
  ];
  const passed = questions.filter((q) => q.ok).length;
  return { questions, passed, verdict: passed === 4 ? "solide" : passed === 3 ? "a_ameliorer" : "a_retravailler" };
}

export const VERDICT_LABEL: Record<Verdict, string> = { solide: "Pilier solide", a_ameliorer: "À améliorer", a_retravailler: "À retravailler" };

export type MethodStep = { n: number; title: string; question: string; done: boolean; detail: string; href: string };

/** Les 6 étapes du métier : où en est la marque, et où agir pour avancer. */
export function methodSteps(s: {
  hasIdentity: boolean; objectives: number; personas: number; diagnostic: Diagnostic | null;
  pillars: { objective?: string | null; cta?: string | null; kpi?: string | null; subthemes?: string[] | null }[]; published: number; planned: number;
}): MethodStep[] {
  const complete = s.pillars.length >= 3 && s.pillars.every((p) => (p.objective ?? "").trim() && (p.cta ?? "").trim() && (p.kpi ?? "").trim() && (p.subthemes ?? []).length >= 2);
  return [
    { n: 1, title: "Comprendre l'organisation", question: "Que fait-elle, pour qui, avec quelles ressources ?", done: s.hasIdentity, detail: s.hasIdentity ? "Identité de marque définie." : "Renseignez l'identité de la marque.", href: "/dashboard/identity" },
    { n: 2, title: "Définir les objectifs", question: "Qu'est-ce que la communication doit permettre d'accomplir ?", done: s.objectives > 0, detail: s.objectives > 0 ? `${s.objectives} objectif${s.objectives > 1 ? "s" : ""} défini${s.objectives > 1 ? "s" : ""}.` : "Aucun objectif : publier davantage est une activité, pas un résultat.", href: "/dashboard/identity" },
    { n: 3, title: "Comprendre les publics", question: "Qui veut-on toucher, avec quels besoins et quels freins ?", done: s.personas > 0, detail: s.personas > 0 ? `${s.personas} cible${s.personas > 1 ? "s" : ""} décrite${s.personas > 1 ? "s" : ""}.` : "Décrivez vos cibles.", href: "/dashboard/personas" },
    { n: 4, title: "Identifier les grands sujets", question: "Quels besoins du public croisent nos objectifs et ce que nous pouvons dire ?", done: !!s.diagnostic?.hypotheses?.length, detail: s.diagnostic?.hypotheses?.length ? "Diagnostic posé." : "Posez le diagnostic : problème, objectif prioritaire, hypothèses.", href: "/dashboard/pillars" },
    { n: 5, title: "Formaliser les piliers", question: "Nom, rôle, objectif, cibles, sous-thèmes, formats, appel à l'action, indicateur.", done: complete, detail: complete ? "Tous les piliers sont complets." : s.pillars.length ? "Des piliers sont incomplets." : "Aucun pilier.", href: "/dashboard/pillars" },
    { n: 6, title: "Tester et ajuster", question: "Que disent les résultats après une période de publication ?", done: s.published > 0, detail: s.published > 0 ? `${s.published} publication${s.published > 1 ? "s" : ""} publiée${s.published > 1 ? "s" : ""}.` : s.planned > 0 ? `${s.planned} publication${s.planned > 1 ? "s" : ""} planifiée${s.planned > 1 ? "s" : ""}, aucune publiée.` : "Rien n'est encore publié.", href: "/dashboard/posts" },
  ];
}

export type ChainRow = { objective: string; pillars: { name: string; pct: number | null; kpi: string | null; ideas: { total: number; kept: number }; posts: { planned: number; published: number } }[] };

/** Chaîne objectif → pilier → idée → publication → résultat : un coup d'œil sur ce qui est branché et ce qui flotte. */
export function strategyChain(
  objectives: string[],
  pillars: { id: string; name: string | null; pct?: number | null; objective?: string | null; kpi?: string | null }[],
  ideas: { pillar_id: string | null; status: string }[],
  posts: { pillar: string | null; status: string }[],
): ChainRow[] {
  const rowFor = (objective: string) => ({ objective, pillars: [] as ChainRow["pillars"] });
  const rows = objectives.map(rowFor);
  const orphans = rowFor("Sans objectif relié");
  for (const p of pillars) {
    const own = ideas.filter((i) => i.pillar_id === p.id);
    const named = posts.filter((x) => x.pillar && p.name && norm(x.pillar) === norm(p.name));
    const entry = {
      name: p.name ?? "Sans nom", pct: p.pct ?? null, kpi: p.kpi ?? null,
      ideas: { total: own.length, kept: own.filter((i) => i.status === "retenue" || i.status === "produite").length },
      posts: { planned: named.filter((x) => x.status !== "publie").length, published: named.filter((x) => x.status === "publie").length },
    };
    const target = p.objective ? rows.find((r) => norm(r.objective) === norm(p.objective ?? "")) : undefined;
    (target ?? orphans).pillars.push(entry);
  }
  return orphans.pillars.length ? [...rows, orphans] : rows;
}
