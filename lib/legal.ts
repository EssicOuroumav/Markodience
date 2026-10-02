/**
 * Informations légales de l'éditeur. À COMPLÉTER avant l'ouverture publique : chaque champ « null »
 * s'affiche comme « À compléter » sur les pages légales, et `npm run check:launch` les signale.
 */
export const LEGAL = {
  // Éditeur du site
  editorName: "Vamourou Cissé" as string | null, // nom ou raison sociale
  editorStatus: "Entrepreneur individuel" as string | null, // à faire valider par un juriste : ce statut suppose en général un enregistrement
  registration: null as string | null, // n° RCCM / identifiant fiscal, si applicable (aucun à ce jour)
  address: "Rue les Carraïbes, Port-Bouët, Abidjan" as string | null,
  publicationDirector: "Vamourou Cissé" as string | null,
  contactEmail: "vamourou.ciisse@gmail.com" as string | null, // aussi utilisée pour les demandes sur les données
  contactPhone: "+225 07 77 54 36 48" as string | null, // obligatoire : la loi ivoirienne sur la consommation (art. 12) impose nom, téléphone et adresse du siège dans toute offre à distance
  country: "Côte d’Ivoire" as string, // pays dont le droit s'applique
  // Version des textes : à incrémenter à chaque modification (stockée avec l'acceptation à l'inscription)
  termsVersion: "2026-10-02",
  lastUpdated: "2 octobre 2026",
  minAge: 16, // âge minimum pour créer un compte (CGU, confidentialité, case à cocher à l'inscription)
} as const;

export const TODO_TEXT = "À compléter";
 