/**
 * Quelles adresses exigent une session ? Utilisé par le proxy (lib/supabase/middleware.ts).
 *  - PUBLIC_PATHS : toujours accessibles (même une route d'API).
 *  - PRIVATE_PREFIXES : exigent une connexion ; sans session, redirection vers /login.
 *  - /api/* : exige une session (401 en JSON), sauf les routes publiques ci-dessus.
 *  - Toute autre adresse passe : une adresse inconnue reçoit donc la vraie page 404 au lieu d'une redirection.
 * Une nouvelle zone privée doit être ajoutée à PRIVATE_PREFIXES (et vérifier elle-même la session côté serveur).
 */
// /payment/return : le retour du prestataire peut arriver sans cookie de session ; la route vérifie le paiement côté serveur.
export const PUBLIC_PATHS = ["/", "/signup", "/login", "/api/payments/webhook", "/payment/return", "/auth/callback", "/cgu", "/confidentialite", "/mentions-legales", "/forgot-password", "/robots.txt", "/sitemap.xml"];
export const PRIVATE_PREFIXES = ["/dashboard", "/admin", "/reset-password", "/payment"];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);

export const isPublicPath = (path: string) => PUBLIC_PATHS.includes(path) || path.startsWith("/opengraph-image");
export const isApiPath = (path: string) => under(path, "/api");
export const requiresSession = (path: string) => !isPublicPath(path) && (isApiPath(path) || PRIVATE_PREFIXES.some((p) => under(path, p)));
