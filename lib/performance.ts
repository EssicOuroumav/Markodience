/** Indicateurs personnalisables : état d'un indicateur à partir de sa dernière valeur. */
export const KPI_PERIODS = ["hebdomadaire", "mensuel", "trimestriel", "annuel"] as const;
export type KpiPeriod = (typeof KPI_PERIODS)[number];
export const KPI_PERIOD_LABEL: Record<KpiPeriod, string> = { hebdomadaire: "Chaque semaine", mensuel: "Chaque mois", trimestriel: "Chaque trimestre", annuel: "Chaque année" };
export const KPI_DIRECTIONS = ["hausse", "baisse"] as const;
export type KpiDirection = (typeof KPI_DIRECTIONS)[number];
export const KPI_DIRECTION_LABEL: Record<KpiDirection, string> = { hausse: "Plus c'est haut, mieux c'est", baisse: "Plus c'est bas, mieux c'est" };
export const ACTION_STATUSES = ["a_faire", "en_cours", "fait"] as const;
export type ActionStatus = (typeof ACTION_STATUSES)[number];
export const ACTION_STATUS_LABEL: Record<ActionStatus, string> = { a_faire: "À faire", en_cours: "En cours", fait: "Fait" };

export type KpiDef = { baseline: number | null; target: number | null; alert_threshold: number | null; direction: KpiDirection };
export type KpiState = "sans_donnee" | "atteint" | "en_bonne_voie" | "en_retard" | "alerte";
export const KPI_STATE_LABEL: Record<KpiState, string> = { sans_donnee: "Sans donnée", atteint: "Objectif atteint", en_bonne_voie: "En bonne voie", en_retard: "En retard", alerte: "Seuil d'alerte franchi" };

const better = (d: KpiDirection, a: number, b: number) => (d === "hausse" ? a >= b : a <= b);

/** Part du chemin parcouru entre le point de départ et l'objectif (0 à 1), ou null s'il manque un des deux. */
export function progress(def: KpiDef, value: number | null): number | null {
  if (value === null || def.baseline === null || def.target === null || def.baseline === def.target) return null;
  return Math.max(0, Math.min(1, (value - def.baseline) / (def.target - def.baseline)));
}

/** Le seuil d'alerte prime : un indicateur sous son seuil est en alerte, même s'il progresse par ailleurs. */
export function kpiState(def: KpiDef, value: number | null): KpiState {
  if (value === null) return "sans_donnee";
  if (def.alert_threshold !== null && !better(def.direction, value, def.alert_threshold)) return "alerte";
  if (def.target !== null && better(def.direction, value, def.target)) return "atteint";
  const p = progress(def, value);
  if (p === null) return "en_bonne_voie";
  return p >= 0.5 ? "en_bonne_voie" : "en_retard";
}

export const STATE_CLS: Record<KpiState, string> = {
  sans_donnee: "bg-black/[0.07] text-ink-secondary",
  atteint: "bg-success/20 text-ink",
  en_bonne_voie: "bg-accent-soft text-accent",
  en_retard: "bg-warning/25 text-ink",
  alerte: "bg-danger/15 text-danger",
};

/** Variation entre les deux dernières valeurs (triées du plus ancien au plus récent). */
export function lastChange(values: { month: string; value: number }[]): number | null {
  const v = [...values].sort((a, b) => a.month.localeCompare(b.month));
  return v.length < 2 ? null : v[v.length - 1].value - v[v.length - 2].value;
}

export const formatValue = (n: number | null, unit = "") => (n === null ? "—" : `${String(Math.round(n * 100) / 100).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${unit ? ` ${unit}` : ""}`);

/** Lit un champ numérique saisi à la française (« 1 200,5 ») ; vide → null ; invalide → undefined. */
export function parseNumber(raw: string): number | null | undefined {
  const s = raw.trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  if (!/^-?\d+(\.\d+)?$/.test(s)) return undefined;
  const n = Number(s);
  return Math.abs(n) <= 1_000_000_000 ? n : undefined;
}
