import type { ErrorEvent } from "@sentry/nextjs";

/**
 * Configuration commune du suivi d'erreurs. Sentry n'est actif que si NEXT_PUBLIC_SENTRY_DSN est défini.
 * Confidentialité : uniquement les erreurs (ni traces de performance, ni enregistrement de session),
 * aucune donnée personnelle par défaut, et les données de requête sont retirées avant l'envoi.
 */
export const sentryOptions = {
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN && process.env.NODE_ENV === "production",
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0,
  beforeSend: scrubEvent,
};

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

/** Retire cookies, en-têtes, corps de requête, adresse IP et e-mails d'un événement avant l'envoi à Sentry. */
export function scrubEvent(event: ErrorEvent): ErrorEvent {
  if (event.request) {
    delete event.request.cookies;
    delete event.request.headers;
    delete event.request.data;
    delete event.request.query_string;
  }
  if (event.user) event.user = { id: event.user.id };
  const clean = (s: string | undefined) => s?.replace(EMAIL, "[e-mail]");
  event.message = clean(event.message);
  for (const ex of event.exception?.values ?? []) ex.value = clean(ex.value);
  return event;
}
