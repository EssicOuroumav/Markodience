import { z } from "zod";

const count = z.number().int().min(0).max(1_000_000_000);

export const kpiData = z.object({
  reach: count,
  engagement: count,
  new_followers: count,
  posts_done: count,
  posts_planned: count,
  /** Indicateurs personnalisés définis par les objectifs de la marque, par clé (voir lib/objectives.ts). */
  custom: z.record(z.string().regex(/^c_[a-z0-9_]{1,30}$/), count).default({}),
  best_content: z.string().max(1000).default(""),
  notes: z.string().max(2000).default(""),
});
export type KpiData = z.infer<typeof kpiData>;

export const EMPTY_KPI: KpiData = { reach: 0, engagement: 0, new_followers: 0, posts_done: 0, posts_planned: 0, custom: {}, best_content: "", notes: "" };

const pad = (n: number) => String(n).padStart(2, "0");

/** Premier jour du mois (YYYY-MM-01) à partir d'une date ISO ou d'une Date. */
export function monthStart(d: Date | string): string {
  const s = typeof d === "string" ? d : `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
  return s.slice(0, 7) + "-01";
}

/** Échéance : jour `day` du mois suivant la période couverte. */
export function deadlineFor(month: string, day: number): string {
  const [y, m] = month.split("-").map(Number);
  const ny = m === 12 ? y + 1 : y;
  const nm = m === 12 ? 1 : m + 1;
  return `${ny}-${pad(nm)}-${pad(Math.min(Math.max(day, 1), 28))}`;
}

export type DeadlineState = "submitted" | "pending" | "late";

/** `today` et `deadline` au format YYYY-MM-DD. L'échéance est dépassée le lendemain. */
export function deadlineState(today: string, deadline: string, submittedAt: string | null): DeadlineState {
  if (submittedAt) return "submitted";
  return today > deadline ? "late" : "pending";
}

/** Un rapport est « à temps » si soumis au plus tard le jour de l'échéance. */
export function wasOnTime(submittedAt: string, deadline: string): boolean {
  return submittedAt.slice(0, 10) <= deadline;
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}`;
}
export function dateLabel(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

/** Séparateur de milliers ASCII (les espaces insécables fines s'affichent mal dans jsPDF). */
export function formatNumber(n: number): string {
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Derniers mois sélectionnables (mois courant inclus). */
export function recentMonths(now: Date, count = 12): string[] {
  return Array.from({ length: count }, (_, i) => monthStart(new Date(now.getFullYear(), now.getMonth() - i, 1)));
}
