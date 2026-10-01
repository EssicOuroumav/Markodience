import type { Feature } from "./plans";

export const TABS = [
  { slug: "identity", label: "Identité de marque", ready: true, feature: "identity" as Feature, pitch: "" },
  { slug: "audit", label: "Audit", ready: true, feature: "audit" as Feature, pitch: "Analysez vos captures et PDF : score, points forts et priorités d'amélioration, en cohérence avec votre positionnement." },
  { slug: "pillars", label: "Piliers de contenu", ready: true, feature: "pillars" as Feature, pitch: "" },
  { slug: "tone", label: "Tonalité & voix", ready: true, feature: "tone" as Feature, pitch: "" },
  { slug: "editorial", label: "Ligne éditoriale", ready: true, feature: "editorial" as Feature, pitch: "Une trame hebdomadaire par canal, avec rotation de vos piliers et workflow de validation." },
  { slug: "kpi", label: "KPIs & Reporting", ready: true, feature: "kpi" as Feature, pitch: "Saisie mensuelle, rappel d'échéance et export PDF de vos rapports de performance." },
  { slug: "rules", label: "Règles opérationnelles", ready: true, feature: "rules" as Feature, pitch: "Centralisez les règles de travail de chaque marque : planning, visuels, communauté, confidentialité." },
  { slug: "lives", label: "Guide Lives", ready: true, feature: "lives" as Feature, pitch: "Préparez vos lives : trame par objectif, équipe, scripts et réponses rapides en un clic." },
] as const;

export type TabSlug = (typeof TABS)[number]["slug"];
