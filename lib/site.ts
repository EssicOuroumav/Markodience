/** Adresse publique du site : variable d'environnement en production, adresse Vercel par défaut. */
export const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("localhost") ? process.env.NEXT_PUBLIC_APP_URL : "https://markodience.vercel.app").replace(/\/$/, "");

export const SITE_NAME = "Markodience";
export const SITE_TAGLINE = "La plateforme des community managers";
export const SITE_DESCRIPTION =
  "Structurez la stratégie de vos marques : identité, piliers de contenu, ligne éditoriale, audit et reporting, générés avec l’IA et pensés pour l’Afrique de l’Ouest francophone.";

/** Pages publiques référencées (plan du site). */
export const PUBLIC_PAGES = ["/", "/signup", "/login", "/cgu", "/confidentialite", "/mentions-legales"] as const;
