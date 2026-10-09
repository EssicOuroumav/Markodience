import { factsBetween, type Fact } from "./facts";
import type { Activity } from "./brief";

export type Phase = "avant" | "pendant" | "apres" | "evergreen";
export const PHASE_LABEL: Record<Phase, string> = { avant: "Avant (teasing)", pendant: "Pendant", apres: "Après (bilan)", evergreen: "Permanent" };

/** Fenêtres de phase, en jours : teasing avant un temps fort, bilan après. */
export const BEFORE_DAYS = 21;
export const AFTER_DAYS = 14;

const DAY = 86_400_000;
const t = (iso: string) => Date.parse(iso + "T00:00:00Z");
const iso = (n: number) => new Date(n).toISOString().slice(0, 10);

export type Week = { index: number; start: string; end: string; month: string; phase: Phase; campaign: string | null; facts: Fact[] };
export type Month = { month: string; label: string; context: string; weeks: Week[] };

/** Premier lundi à la date donnée ou après. */
export function mondayOnOrAfter(date: string): string {
  const dow = (new Date(t(date)).getUTCDay() + 6) % 7;
  return dow === 0 ? date : iso(t(date) + (7 - dow) * DAY);
}

const overlap = (aS: number, aE: number, bS: number, bE: number) => Math.max(0, Math.min(aE, bE) - Math.max(aS, bS) + DAY) / DAY;

/** Phase d'une semaine selon les activités : pendant > après > avant > permanent. Calculée par le code, jamais par l'IA. */
export function phaseOf(weekStart: string, weekEnd: string, activities: Activity[]): { phase: Phase; campaign: string | null } {
  const s = t(weekStart), e = t(weekEnd);
  let best: { name: string; days: number } | null = null;
  for (const a of activities) {
    const days = overlap(s, e, t(a.start), t(a.end));
    if (days > 0 && (!best || days > best.days)) best = { name: a.name, days };
  }
  if (best) return { phase: "pendant", campaign: best.name };
  const finished = activities.filter((a) => t(a.end) < s && s - t(a.end) <= AFTER_DAYS * DAY).sort((x, y) => t(y.end) - t(x.end))[0];
  if (finished) return { phase: "apres", campaign: finished.name };
  const upcoming = activities.filter((a) => t(a.start) > e && t(a.start) - e <= BEFORE_DAYS * DAY).sort((x, y) => t(x.start) - t(y.start))[0];
  if (upcoming) return { phase: "avant", campaign: upcoming.name };
  return { phase: "evergreen", campaign: null };
}

export function buildWeeks(start: string, count: number, activities: Activity[], country?: string, context?: string): Week[] {
  const first = mondayOnOrAfter(start);
  const last = iso(t(first) + (count * 7 - 1) * DAY);
  const facts = factsBetween(first, last, country, context);
  return Array.from({ length: count }, (_, i) => {
    const ws = iso(t(first) + i * 7 * DAY);
    const we = iso(t(ws) + 6 * DAY);
    const { phase, campaign } = phaseOf(ws, we, activities);
    return {
      index: i + 1,
      start: ws,
      end: we,
      month: iso(t(ws) + 3 * DAY).slice(0, 7), // le mois d'une semaine est celui de son jeudi
      phase,
      campaign,
      facts: facts.filter((f) => f.date <= we && (f.end ?? f.date) >= ws),
    };
  });
}

const MONTHS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
export const monthName = (ym: string) => `${MONTHS[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** Regroupe par mois, avec une ligne de contexte : campagnes actives et temps forts du mois. */
export function groupMonths(weeks: Week[]): Month[] {
  const map = new Map<string, Week[]>();
  for (const w of weeks) map.set(w.month, [...(map.get(w.month) ?? []), w]);
  return [...map.entries()].map(([month, ws]) => {
    const campaigns = [...new Set(ws.map((w) => w.campaign).filter((c): c is string => !!c))];
    const facts = [...new Set(ws.flatMap((w) => w.facts).map((f) => f.label))].slice(0, 3);
    return { month, label: monthName(month), context: [...campaigns, ...facts].join(" · ") || "Contenus permanents", weeks: ws };
  });
}
