import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/sentry";

/** Démarre le suivi d'erreurs côté serveur (Node et edge). */
export async function register() {
  Sentry.init(sentryOptions);
}

/** Transmet à Sentry les erreurs survenues pendant une requête serveur (pages, routes API). */
export const onRequestError = Sentry.captureRequestError;
