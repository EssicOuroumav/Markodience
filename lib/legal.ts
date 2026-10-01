/**
 * Informations légales de l'éditeur. À COMPLÉTER avant l'ouverture publique : chaque champ « null »
 * s'affiche comme « À compléter » sur les pages légales, et `npm run check:launch` les signale.
 */
export const LEGAL = {
  // Éditeur du site
  editorName: null as string | null, // nom ou raison sociale (ex. « Vamourou Cissé » ou « Markodience SARL »)
  editorStatus: null as string | null, // ex. « Entrepreneur individuel », « SARL au capital de … »
  registration: null as string | null, // n° RCCM / identifiant fiscal, si applicable
  address: null as string | null, // adresse postale complète
  publicationDirector: null as string | null,
  contactEmail: null as string | null, // adresse de contact (aussi utilisée pour les demandes RGPD)
  contactPhone: null as string | null,
  country: "Côte d’Ivoire" as string, // pays dont le droit s'applique
  // Version des textes : à incrémenter à chaque modification (stockée avec l'acceptation à l'inscription)
  termsVersion: "2026-10-02",
  lastUpdated: "2 octobre 2026",
} as const;

export const TODO_TEXT = "À compléter";

export const missingLegalFields = () =>
  (["editorName", "editorStatus", "address", "publicationDirector", "contactEmail"] as const).filter((k) => !LEGAL[k]);
