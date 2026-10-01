export const OBJECTIVES = ["vente", "formation", "information", "promotion", "echange"] as const;
export type Objective = (typeof OBJECTIVES)[number];

export const OBJECTIVE_LABELS: Record<Objective, string> = {
  vente: "Vente",
  formation: "Formation",
  information: "Information / Annonce",
  promotion: "Promotion",
  echange: "Échange thématique",
};

/** Trame attendue par objectif : jamais la même structure pour tous. */
export const OBJECTIVE_STRUCTURE: Record<Objective, string[]> = {
  vente: ["ouverture", "présentation d'offre", "gestion des objections", "clôture"],
  formation: ["introduction", "démonstration / contenu pédagogique", "session de questions", "récapitulatif"],
  information: ["contexte", "annonce principale", "détails pratiques", "appel à l'action adapté"],
  promotion: ["accroche", "présentation de l'offre limitée", "preuve sociale", "appel à l'action"],
  echange: ["introduction du sujet", "animation de la discussion", "synthèse", "clôture"],
};

export type LiveStep = { time_range: string; title: string; description: string };

export function moveItem<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}
