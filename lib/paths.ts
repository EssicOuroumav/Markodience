/**
 * Quelles adresses exigent une session ? Utilisé par le proxy (lib/supabase/middleware.ts).
 *  - PUBLIC_PATHS : toujours accessibles (même une route d'API).
 *  - PRIVATE_PREFIXES : exigent une connexion ; sans session, redirection vers /login.
 *  - /api/* : exige une session (401 en JSON), sauf les routes publiques ci-dessus.
 *  - Toute autre adresse passe : une adresse inconnue reçoit donc la vraie page 404 au lieu d'une redirection.
 * Une nouvelle zone privée doit être ajoutée à PRIVATE_PREFIXES (et vérifier elle-même la session côté serveur).
 */
// /api/cron/reminders : appelée par la tâche planifiée, protégée par CRON_SECRET (la route vérifie elle-même).
// /payment/return : le retour du prestataire peut arriver sans cookie de session ; la route vérifie le paiement côté serveur.
export const PUBLIC_PATHS = ["/", "/signup", "/login", "/api/payments/webhook", "/api/cron/reminders", "/payment/return", "/auth/callback", "/cgu", "/confidentialite", "/mentions-legales", "/forgot-password", "/robots.txt", "/sitemap.xml"];
export const PRIVATE_PREFIXES = ["/dashboard", "/admin", "/reset-password", "/payment"];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

// /validation/<lien> et /api/validation/decide : le validateur n'a pas de compte, le lien secret fait office de clé (vérifié par les routes).
export const PUBLIC_PREFIXES = ["/opengraph-image", "/validation/", "/api/validation/decide"];
export const isPublicPath = (path: string) => PUBLIC_PATHS.includes(path) || PUBLIC_PREFIXES.some((p) => path.startsWith(p));
export const isApiPath = (path: string) => under(path, "/api");
export const requiresSession = (path: string) => !isPublicPath(path) && (isApiPath(path) || PRIVATE_PREFIXES.some((p) => under(path, p)));
