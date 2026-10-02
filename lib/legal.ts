/**
 * Informations légales de l'éditeur. À COMPLÉTER avant l'ouverture publique : chaque champ « null »
 * s'affiche comme « À compléter » sur les pages légales, et `npm run check:launch` les signale.
 */
export const LEGAL = {
  // Éditeur du site
  editorName: null as string | null, // nom ou raison sociale Vamourou Cissé
  editorStatus: null as string | null, // Entrepreneur individuel 
  registration: null as string | null, // n° RCCM / identifiant fiscal, si applicable
  address: null as string | null, // Rue les Carraïbes, Port-Bouët, Abidjan
  publicationDirector: null as string | null,
  contactEmail: null as string | null, // adresse de contact vamourou.ciisse@gmail.com
  contactPhone: null as string | null, // obligatoire : la loi ivoirienne sur la consommation (art. 12) impose nom, téléphone et adresse du siège dans toute offre à distance 0777543648
  country: "Côte d’Ivoire" as string, // pays dont le droit s'applique
  // Version des textes : à incrémenter à chaque modification (stockée avec l'acceptation à l'inscription)
  termsVersion: "2026-10-02",
  lastUpdated: "2 octobre 2026",
  minAge: 16, // âge minimum pour créer un compte (CGU, confidentialité, case à cocher à l'inscription)
} as const;

export const TODO_TEXT = "À compléter";
 