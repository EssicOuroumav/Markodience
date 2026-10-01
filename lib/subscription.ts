/** Jours restants avant une date d'échéance (YYYY-MM-DD), calculés en UTC. Négatif si la date est passée. */
export function daysUntil(dateIso: string, now: Date = new Date()): number {
  const target = Date.parse(`${dateIso.slice(0, 10)}T00:00:00Z`);
  const today = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00Z`);
  return Math.round((target - today) / 86_400_000);
}

export type SubscriptionNotice =
  | { kind: "expiring"; days: number }
  | { kind: "expired"; daysAgo: number }
  | null;

/**
 * Avertissement à afficher selon l'état de l'abonnement :
 * palier payant qui expire dans 7 jours ou moins, ou abonnement échu (retour au palier gratuit).
 * Le propriétaire et les comptes gratuits sans historique n'ont jamais d'avertissement.
 */
export function subscriptionNotice(activePlan: string, periodEnd: string | null, owner: boolean, now: Date = new Date()): SubscriptionNotice {
  if (owner || !periodEnd) return null;
  const days = daysUntil(periodEnd, now);
  if (activePlan !== "gratuit") return days >= 0 && days <= 7 ? { kind: "expiring", days } : null;
  return days < 0 ? { kind: "expired", daysAgo: -days } : null;
}
