import { z } from "zod";
import { monthLabel, monthStart } from "./kpi";

/** Indicateurs du suivi mensuel (onglet KPIs) auxquels un objectif peut être relié. */
export const OBJECTIVE_METRICS = ["reach", "engagement", "new_followers", "posts_done"] as const;
export type ObjectiveMetric = (typeof OBJECTIVE_METRICS)[number];

/** « monthly » : on compare le dernier rapport mensuel à la cible. « cumulative » : on additionne les rapports depuis la date de départ. */
export const METRIC_INFO: Record<ObjectiveMetric, { label: string; unit: string; mode: "monthly" | "cumulative"; help: string; example: string }> = {
  reach: {
    label: "Portée mensuelle", unit: "personnes", mode: "monthly",
    help: "Le nombre de personnes différentes qui ont vu vos publications dans le mois (« Portée » dans les statistiques Facebook ou Instagram).",
    example: "« Atteindre 100 000 personnes touchées par mois » : cible 100 000.",
  },
  engagement: {
    label: "Engagement mensuel", unit: "interactions", mode: "monthly",
    help: "Le total des interactions du mois : j'aime, commentaires, partages et messages reçus.",
    example: "« Générer 1 200 interactions par mois » : cible 1 200.",
  },
  new_followers: {
    label: "Nouveaux abonnés (cumul)", unit: "abonnés", mode: "cumulative",
    help: "Le nombre d'abonnés gagnés dans le mois. Les mois s'additionnent à partir du moment où vous créez la mesure.",
    example: "« Gagner 5 000 abonnés en 6 mois » : cible 5 000.",
  },
  posts_done: {
    label: "Publications par mois", unit: "publications", mode: "monthly",
    help: "Le nombre de publications faites dans le mois.",
    example: "« Publier 3 fois par semaine » : cible 12 (3 × 4 semaines).",
  },
};

export const objectiveSchema = z.object({
  text: z.string().min(1).max(600),
  metric: z.enum(OBJECTIVE_METRICS).nullish(),
  target: z.number().positive().max(1_000_000_000).nullish(),
  since: z.string().regex(/^\d{4}-\d{2}-01$/).nullish(),
});
export type Objective = z.infer<typeof objectiveSchema>;

/**
 * Les anciens objectifs étaient de simples textes : ils restent valides (sans mesure). Une mesure incomplète
 * (indicateur sans cible, ou cible sans indicateur) est retirée. Pour un indicateur cumulatif, la date de départ est
 * fixée au mois courant si elle manque.
 */
export function normalizeObjectives(raw: unknown, now: Date = new Date()): Objective[] {
  if (!Array.isArray(raw)) return [];
  const out: Objective[] = [];
  for (const item of raw) {
    const parsed = objectiveSchema.safeParse(typeof item === "string" ? { text: item } : item);
    if (!parsed.success) continue;
    const text = parsed.data.text.trim();
    if (!text) continue;
    const { metric, target, since } = parsed.data;
    if (!metric || !target) {
      out.push({ text });
      continue;
    }
    out.push({ text, metric, target, ...(METRIC_INFO[metric].mode === "cumulative" ? { since: since ?? monthStart(now) } : {}) });
  }
  return out;
}

export type KpiPoint = { month: string; data: unknown };
export type ObjectiveProgress = { current: number; target: number; percent: number; reached: boolean; basis: string };

const valueOf = (data: unknown, metric: ObjectiveMetric): number | null => {
  const v = (data as Record<string, unknown> | null | undefined)?.[metric];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
};

/** Avancement d'un objectif d'après les rapports KPI ; null si l'objectif n'est pas mesuré ou s'il n'y a encore aucun rapport utile. */
export function objectiveProgress(o: Objective, reports: KpiPoint[]): ObjectiveProgress | null {
  if (!o.metric || !o.target) return null;
  const usable = reports.filter((r) => valueOf(r.data, o.metric!) !== null).sort((a, b) => (a.month < b.month ? 1 : -1));
  let current: number;
  let basis: string;
  if (METRIC_INFO[o.metric].mode === "cumulative") {
    const since = o.since ?? "0000-00-00";
    const counted = usable.filter((r) => r.month >= since);
    if (counted.length === 0) return null;
    current = counted.reduce((sum, r) => sum + (valueOf(r.data, o.metric!) ?? 0), 0);
    basis = `Cumul depuis ${monthLabel(since === "0000-00-00" ? counted[counted.length - 1].month : since)}`;
  } else {
    if (usable.length === 0) return null;
    current = valueOf(usable[0].data, o.metric)!;
    basis = `Dernier rapport : ${monthLabel(usable[0].month)}`;
  }
  const percent = Math.min(100, Math.round((current / o.target) * 100));
  return { current, target: o.target, percent, reached: current >= o.target, basis };
}
