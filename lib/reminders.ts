import { daysUntil } from "./subscription";
import { deadlineFor, monthStart } from "./kpi";

export type ReminderKind = "kpi" | "posts" | "billing";
export type ReminderItem = { kind: ReminderKind; text: string; href: string };

export type ReminderPrefs = { email_enabled: boolean; kpi: boolean; posts: boolean; billing: boolean };
export const DEFAULT_PREFS: ReminderPrefs = { email_enabled: true, kpi: true, posts: true, billing: true };

export type BrandFacts = {
  name: string;
  /** Jour du mois de l'échéance du rapport (réglable par marque). */
  kpiDeadlineDay: number;
  /** Le rapport du mois précédent est-il déjà soumis ? */
  kpiPreviousSubmitted: boolean;
  /** Le palier de l'utilisateur inclut-il le suivi KPI ? */
  kpiAvailable: boolean;
  /** Publications non publiées prévues aujourd'hui et demain. */
  postsToday: number;
  postsTomorrow: number;
  postsAvailable: boolean;
};

export type UserFacts = {
  brands: BrandFacts[];
  /** Palier payant et fin de période, sinon null. */
  billing: { plan: string; periodEnd: string } | null;
};

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;
const DAY_LABEL = (d: number) => (d === 0 ? "aujourd'hui" : d === 1 ? "demain" : `dans ${d} jours`);

/** Les rappels du jour, selon des règles fixes (calculées à partir de la date : un rejeu le même jour donne le même résultat). */
export function buildReminders(facts: UserFacts, prefs: ReminderPrefs, now: Date = new Date()): ReminderItem[] {
  if (!prefs.email_enabled) return [];
  const items: ReminderItem[] = [];
  const prevMonth = monthStart(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10));

  for (const b of facts.brands) {
    if (prefs.kpi && b.kpiAvailable && !b.kpiPreviousSubmitted) {
      const deadline = deadlineFor(prevMonth, b.kpiDeadlineDay);
      const d = daysUntil(deadline, now);
      if (d === 2 || d === 0) items.push({ kind: "kpi", href: "/dashboard/kpi", text: `${b.name} : le rapport KPI du mois dernier est à rendre ${DAY_LABEL(d)}.` });
      else if (d === -1) items.push({ kind: "kpi", href: "/dashboard/kpi", text: `${b.name} : le rapport KPI du mois dernier est en retard d'un jour.` });
    }
    if (prefs.posts && b.postsAvailable) {
      if (b.postsToday > 0) items.push({ kind: "posts", href: "/dashboard/posts", text: `${b.name} : ${plural(b.postsToday, "publication à publier", "publications à publier")} aujourd'hui.` });
      if (b.postsTomorrow > 0) items.push({ kind: "posts", href: "/dashboard/posts", text: `${b.name} : ${plural(b.postsTomorrow, "publication prévue", "publications prévues")} demain.` });
    }
  }

  if (prefs.billing && facts.billing) {
    const d = daysUntil(facts.billing.periodEnd, now);
    if (d === 7 || d === 3 || d === 1) items.push({ kind: "billing", href: "/dashboard/upgrade", text: `Votre abonnement ${facts.billing.plan} se termine ${DAY_LABEL(d)} (${facts.billing.periodEnd.slice(0, 10).split("-").reverse().join("/")}).` });
  }
  return items;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);

/** Message du jour : sujet, texte brut et HTML. Le contenu fourni par l'utilisateur (noms de marques) est échappé. */
export function renderReminderEmail(items: ReminderItem[], appUrl: string): { subject: string; text: string; html: string } {
  const base = appUrl.replace(/\/$/, "");
  const subject = items.length === 1 ? "Markodience : 1 rappel pour vous" : `Markodience : ${items.length} rappels pour vous`;
  const text = [
    "Bonjour,",
    "",
    ...items.map((i) => `- ${i.text}\n  ${base}${i.href}`),
    "",
    `Vous pouvez choisir les rappels que vous recevez dans Mon compte : ${base}/dashboard/account`,
    "Markodience",
  ].join("\n");
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;color:#1d1d1f"><p>Bonjour,</p><ul style="padding-left:18px">${items
    .map((i) => `<li style="margin:10px 0">${esc(i.text)}<br><a href="${esc(base + i.href)}" style="color:#0071e3">Ouvrir</a></li>`)
    .join("")}</ul><p style="color:#6e6e73;font-size:13px">Vous pouvez choisir les rappels que vous recevez dans <a href="${esc(base)}/dashboard/account" style="color:#6e6e73">Mon compte</a>.<br>Markodience</p></div>`;
  return { subject, text, html };
}
