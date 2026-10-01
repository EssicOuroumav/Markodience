export type PeriodMonths = 1 | 3;

/** Nombre de semaines générées : 4 pour 1 mois, 12 pour 3 mois. */
export const weeksForPeriod = (months: PeriodMonths) => (months === 1 ? 4 : 12);

export function addMonths(isoDate: string, months: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1 + months, 1));
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(d, lastDay));
  return target.toISOString().slice(0, 10);
}

/** Période : de `start` jusqu'à la veille du même jour, `months` mois plus tard. */
export function periodRange(startIso: string, months: PeriodMonths) {
  const end = new Date(addMonths(startIso, months) + "T00:00:00Z");
  end.setUTCDate(end.getUTCDate() - 1);
  return { period_start: startIso, period_end: end.toISOString().slice(0, 10) };
}

/**
 * Plan de rotation des piliers : chaque semaine reçoit un pilier principal en
 * rotation (et un secondaire optionnel). Garantit qu'aucun pilier n'est étiré
 * sur toute la période et qu'aucune semaine n'est déconnectée des piliers.
 */
export function pillarRotation(pillarNames: string[], weeks: number) {
  const n = pillarNames.length;
  return Array.from({ length: weeks }, (_, i) => ({
    week_number: i + 1,
    primary: pillarNames[i % n],
    secondary: n > 1 && i % 2 === 1 ? pillarNames[(i + 1) % n] : null,
  }));
}

export const STATUS_ORDER = ["a_venir", "en_cours", "termine"] as const;
export type EntryStatus = (typeof STATUS_ORDER)[number];
export const nextStatus = (s: EntryStatus): EntryStatus => STATUS_ORDER[(STATUS_ORDER.indexOf(s) + 1) % STATUS_ORDER.length];
