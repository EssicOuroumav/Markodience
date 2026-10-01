/** Destinations autorisées après le retour d'un lien de messagerie (liste blanche : jamais d'URL venant de l'extérieur). */
const ALLOWED = ["/dashboard", "/reset-password"] as const;

export function safeNext(next: string | null | undefined): (typeof ALLOWED)[number] {
  return (ALLOWED as readonly string[]).includes(next ?? "") ? (next as (typeof ALLOWED)[number]) : "/dashboard";
}
