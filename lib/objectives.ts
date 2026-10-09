import { z } from "zod";
import { monthLabel, monthStart } from "./kpi";

/**
 * Objectifs marketing mesurés. Un objectif peut être relié à un indicateur :
 *  - un indicateur prédéfini (les 4 chiffres historiques du rapport mensuel), ou
 *  - un indicateur personnalisé (« Contacts WhatsApp », « Dons reçus »…) défini par l'utilisateur ou proposé par l'IA.

 * Un objectif de régularité qui ne se compte pas (« publier un bilan chaque trimestre ») est « à cocher » : une case par
 * période (mois ou trimestre), cochée quand l'engagement a été tenu.
 * Les valeurs se saisissent dans le rapport mensuel (onglet KPIs) : champs prédéfinis, ou `data.custom[clé]` pour les personnalisés.
 */
export const OBJECTIVE_METRICS = ["reach", "engagement", "new_followers", "posts_done"] as const;
export type ObjectiveMetric = (typeof OBJECTIVE_METRICS)[number];

export type IndicatorMode = "monthly" | "cumulative";
export const INDICATOR_MODES: readonly IndicatorMode[] = ["monthly", "cumulative"];
export const MODE_LABELS: Record<IndicatorMode, string> = {
  monthly: "Par mois : on compare chaque mois à la cible",
  cumulative: "Cumul : les mois s'additionnent jusqu'à la cible",
};

/** Indicateurs prédéfinis : `mode` est leur période par défaut (modifiable pour chaque objectif). */
export const METRIC_INFO: Record<ObjectiveMetric, { label: string; unit: string; mode: IndicatorMode; help: string; example: string }> = {
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
    label: "Nouveaux abonnés", unit: "abonnés", mode: "cumulative",
    help: "Le nombre d'abonnés gagnés dans le mois, tous réseaux confondus.",
    example: "« Gagner 5 000 abonnés en 6 mois » : cible 5 000, en cumul.",
  },
  posts_done: {
    label: "Publications par mois", unit: "publications", mode: "monthly",
    help: "Le nombre de publications faites dans le mois.",
    example: "« Publier 3 fois par semaine » : cible 12 (3 × 4 semaines).",
  },
};

export type Indicator = { key: string; label: string; unit: string; mode: IndicatorMode; builtin?: ObjectiveMetric };
export type CheckFrequency = "monthly" | "quarterly";
export const CHECK_FREQUENCIES: readonly CheckFrequency[] = ["monthly", "quarterly"];
export const FREQUENCY_LABELS: Record<CheckFrequency, string> = { monthly: "Chaque mois", quarterly: "Chaque trimestre" };
/** Objectif à cocher : `since` (YYYY-MM-01) est le début du suivi, `done` la liste des périodes tenues (clés « 2026-10 » ou « 2026-Q4 »). */
export type Checklist = { frequency: CheckFrequency; since: string; done: string[] };
export type Objective = { text: string; indicator?: Indicator; target?: number; since?: string; check?: Checklist };

const isMetric = (v: unknown): v is ObjectiveMetric => typeof v === "string" && (OBJECTIVE_METRICS as readonly string[]).includes(v);
const isMode = (v: unknown): v is IndicatorMode => v === "monthly" || v === "cumulative";
const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Clé stable d'un indicateur personnalisé, dérivée de son nom : deux objectifs au même nom partagent le même champ du rapport. */
export function customKey(label: string): string {
  const slug = label.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 28);
  return `c_${slug || "indicateur"}`;
}
export const CUSTOM_KEY = /^c_[a-z0-9_]{1,30}$/;

/** Construit un indicateur à partir d'une saisie (utilisateur ou IA) ; null si inexploitable. */
export function buildIndicator(src: { builtin?: unknown; metric?: unknown; label?: unknown; unit?: unknown; mode?: unknown }): Indicator | null {
  const builtin = isMetric(src.builtin) ? src.builtin : isMetric(src.metric) ? src.metric : undefined;
  const mode = isMode(src.mode) ? src.mode : builtin ? METRIC_INFO[builtin].mode : "monthly";
  if (builtin) {
    return { key: builtin, label: str(src.label, 40) || METRIC_INFO[builtin].label, unit: str(src.unit, 24) || METRIC_INFO[builtin].unit, mode, builtin };
  }
  const label = str(src.label, 40);
  if (label.length < 2) return null;
  return { key: customKey(label), label, unit: str(src.unit, 24), mode };
}

const PERIOD_KEY = /^\d{4}-(0[1-9]|1[0-2]|Q[1-4])$/;
const isFrequency = (v: unknown): v is CheckFrequency => v === "monthly" || v === "quarterly";

/** Objectif à cocher à partir d'une saisie (utilisateur ou IA) ; null si la fréquence est inconnue. */
function parseChecklist(raw: unknown, now: Date): Checklist | null {
  if (!raw || typeof raw !== "object") return null;
  const c = raw as Record<string, unknown>;
  if (!isFrequency(c.frequency)) return null;
  const since = typeof c.since === "string" && /^\d{4}-\d{2}-01$/.test(c.since) ? c.since : monthStart(now);
  const valid = (k: unknown): k is string => typeof k === "string" && PERIOD_KEY.test(k) && (c.frequency === "quarterly" ? k.includes("Q") : !k.includes("Q"));
  const done = Array.isArray(c.done) ? [...new Set(c.done.filter(valid))].sort() : [];
  return { frequency: c.frequency, since, done };
}

/**
 * Tolérant : les anciens objectifs (texte simple, ou « metric » + « target ») restent valides, l'IA peut envoyer des
 * objets plus ou moins complets. Une mesure incomplète (indicateur sans cible, ou l'inverse) est retirée. Un cumul reçoit
 * pour date de départ le mois courant s'il n'en a pas.
 */
export function normalizeObjectives(raw: unknown, now: Date = new Date()): Objective[] {
  if (!Array.isArray(raw)) return [];
  const out: Objective[] = [];
  for (const item of raw) {
    const o = (typeof item === "string" ? { text: item } : item) as Record<string, unknown> | null;
    if (!o || typeof o !== "object") continue;
    const text = str(o.text, 600);
    if (!text) continue;
    const ind = o.indicator && typeof o.indicator === "object" ? (o.indicator as Record<string, unknown>) : { metric: o.metric };
    const indicator = buildIndicator(ind);
    const target = typeof o.target === "number" && Number.isFinite(o.target) && o.target > 0 && o.target <= 1_000_000_000 ? o.target : undefined;
    if (!indicator || !target) {
      const check = parseChecklist(o.check ?? (o.frequency ? { frequency: o.frequency } : null), now);
      out.push(check ? { text, check } : { text });
      continue;
    }
    const since = typeof o.since === "string" && /^\d{4}-\d{2}-01$/.test(o.since) ? o.since : monthStart(now);
    out.push({ text, indicator, target, ...(indicator.mode === "cumulative" ? { since } : {}) });
  }
  return out;
}

/** Indicateurs distincts utilisés par les objectifs (le premier nom rencontré fait foi). */
export function uniqueIndicators(objectives: Objective[]): Indicator[] {
  const seen = new Map<string, Indicator>();
  for (const o of objectives) if (o.indicator && !seen.has(o.indicator.key)) seen.set(o.indicator.key, o.indicator);
  return [...seen.values()];
}
/** Indicateurs personnalisés : ce sont eux qui ajoutent des champs au rapport mensuel. */
export const customIndicators = (objectives: Objective[]) => uniqueIndicators(objectives).filter((i) => !i.builtin);

export type KpiPoint = { month: string; data: unknown };
export type ObjectiveProgress = { current: number; target: number; percent: number; reached: boolean; basis: string };

/** Valeur d'un indicateur dans un rapport mensuel ; null si absente. */
export function indicatorValue(data: unknown, ind: Indicator): number | null {
  const rec = data as Record<string, unknown> | null | undefined;
  const v = ind.builtin ? rec?.[ind.builtin] : (rec?.custom as Record<string, unknown> | undefined)?.[ind.key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** Avancement d'un objectif d'après les rapports KPI ; null si l'objectif n'est pas mesuré ou s'il n'y a encore aucune donnée. */
export function objectiveProgress(o: Objective, reports: KpiPoint[]): ObjectiveProgress | null {
  const ind = o.indicator;
  if (!ind || !o.target) return null;
  const usable = reports.filter((r) => indicatorValue(r.data, ind) !== null).sort((a, b) => (a.month < b.month ? 1 : -1));
  let current: number;
  let basis: string;
  if (ind.mode === "cumulative") {
    const since = o.since ?? "0000-00-00";
    const counted = usable.filter((r) => r.month >= since);
    if (counted.length === 0) return null;
    current = counted.reduce((sum, r) => sum + (indicatorValue(r.data, ind) ?? 0), 0);
    basis = `Cumul depuis ${monthLabel(since === "0000-00-00" ? counted[counted.length - 1].month : since)}`;
  } else {
    if (usable.length === 0) return null;
    current = indicatorValue(usable[0].data, ind)!;
    basis = `Dernier rapport : ${monthLabel(usable[0].month)}`;
  }
  const percent = Math.min(100, Math.round((current / o.target) * 100));
  return { current, target: o.target, percent, reached: current >= o.target, basis };
}

// ---------------------------------------------------------------- objectifs à cocher

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Clé de la période d'une date (YYYY-MM-JJ ou Date) : « 2026-10 » (mois) ou « 2026-Q4 » (trimestre). */
export function periodKey(date: Date | string, frequency: CheckFrequency): string {
  const [y, m] = typeof date === "string" ? date.split("-").map(Number) : [date.getFullYear(), date.getMonth() + 1];
  return frequency === "monthly" ? `${y}-${pad2(m)}` : `${y}-Q${Math.floor((m - 1) / 3) + 1}`;
}

export function periodLabel(key: string): string {
  if (key.includes("Q")) {
    const [y, q] = key.split("-Q");
    return `T${q} ${y}`;
  }
  return monthLabel(`${key}-01`);
}

/** Périodes écoulées depuis le début du suivi jusqu'à la période en cours incluse, de la plus ancienne à la plus récente. */
export function periodsSince(since: string, now: Date, frequency: CheckFrequency): string[] {
  const keys: string[] = [];
  const [y0, m0] = since.split("-").map(Number);
  let y = y0, m = m0;
  const last = periodKey(now, frequency);
  for (let guard = 0; guard < 600; guard++) {
    const key = periodKey(`${y}-${pad2(m)}-01`, frequency);
    if (keys[keys.length - 1] !== key) keys.push(key);
    if (key === last || key > last) break;
    m += 1;
    if (m > 12) { m = 1; y += 1; }
  }
  return keys;
}

export type ChecklistProgress = { periods: string[]; done: number; total: number; percent: number; currentKey: string; currentDone: boolean };

/** Périodes tenues sur les périodes écoulées (la période en cours compte dans le total tant qu'elle n'est pas cochée). */
export function checklistProgress(check: Checklist, now: Date): ChecklistProgress {
  const periods = periodsSince(check.since, now, check.frequency);
  const done = periods.filter((p) => check.done.includes(p)).length;
  const currentKey = periodKey(now, check.frequency);
  return { periods, done, total: periods.length, percent: Math.round((done / Math.max(periods.length, 1)) * 100), currentKey, currentDone: check.done.includes(currentKey) };
}

/** Coche ou décoche une période (liste triée, sans doublon). */
export function toggleDone(check: Checklist, key: string): Checklist {
  const done = check.done.includes(key) ? check.done.filter((k) => k !== key) : [...check.done, key];
  return { ...check, done: [...new Set(done)].sort() };
}

// Validation d'une saisie venant de l'IA (champs facultatifs, tolérance gérée par normalizeObjectives).
export const objectiveInputSchema = z.union([z.string().min(1), z.record(z.string(), z.unknown())]);
