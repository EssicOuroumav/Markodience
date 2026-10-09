import type { Feature } from "./plans";

export const TABS = [
  { slug: "identity", description: "Mission, valeurs, positionnement, cibles et objectifs : les fondations de la marque.", label: "Identité de marque", ready: true, feature: "identity" as Feature, pitch: "" },
  { slug: "charter", description: "Couleurs, typographie, règles du logo et style de visuels : le cadre à remettre à un graphiste ou à un partenaire.", label: "Charte graphique", ready: true, feature: "identity" as Feature, pitch: "" },
  { slug: "audit", description: "Analysez vos captures et PDF pour obtenir un score et des priorités d’amélioration.", label: "Audit", ready: true, feature: "audit" as Feature, pitch: "Analysez vos captures et PDF : score, points forts et priorités d'amélioration, en cohérence avec votre positionnement." },
  { slug: "pillars", description: "Les grands thèmes de contenu qui structurent toutes vos publications.", label: "Piliers de contenu", ready: true, feature: "pillars" as Feature, pitch: "" },
  { slug: "tone", description: "La voix de la marque : ce qu’on dit, et ce qu’on évite.", label: "Tonalité & voix", ready: true, feature: "tone" as Feature, pitch: "" },
  { slug: "editorial", description: "Votre trame hebdomadaire par canal, avec rotation des piliers et validation.", label: "Ligne éditoriale", ready: true, feature: "editorial" as Feature, pitch: "Une trame hebdomadaire par canal, avec rotation de vos piliers et workflow de validation." },
  { slug: "posts", description: "Les publications rédigées semaine par semaine, placées sur un calendrier : légende, idée de visuel, hashtags.", label: "Publications", ready: true, feature: "editorial" as Feature, pitch: "Des publications prêtes à poster, rédigées à partir de votre ligne éditoriale, placées sur un calendrier." },
  { slug: "library", optional: true, description: "Logos, photos, visuels et documents de la marque, rangés au même endroit.", label: "Bibliothèque", ready: true, feature: "library" as Feature, pitch: "Rangez les logos, photos, visuels et documents de chaque marque au même endroit, prêts à être retrouvés et téléchargés." },
  { slug: "kpi", description: "Saisie mensuelle, échéance et export PDF de vos rapports de performance.", label: "KPIs & Reporting", ready: true, feature: "kpi" as Feature, pitch: "Saisie mensuelle, rappel d'échéance et export PDF de vos rapports de performance." },
  { slug: "rules", description: "Les règles de travail de la marque, section par section.", label: "Règles opérationnelles", ready: true, feature: "rules" as Feature, pitch: "Centralisez les règles de travail de chaque marque : planning, visuels, communauté, confidentialité." },
  { slug: "lives", description: "Préparez vos lives : trame, équipe, scripts et réponses rapides.", label: "Guide Lives", ready: true, feature: "lives" as Feature, pitch: "Préparez vos lives : trame par objectif, équipe, scripts et réponses rapides en un clic." },
] as const;

export type TabSlug = (typeof TABS)[number]["slug"];
