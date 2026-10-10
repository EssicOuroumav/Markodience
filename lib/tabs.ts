import type { Feature } from "./plans";

export const TABS = [
  { slug: "plan", optional: true, description: "Décrivez votre organisation : l'IA construit le plan complet étape par étape et le met en place dans vos onglets.", label: "Plan stratégique", ready: true, feature: "editorial" as Feature, pitch: "Décrivez votre organisation en quelques lignes : l'IA construit l'identité, les piliers, le calendrier de l'année, la ligne éditoriale de chaque réseau, les règles et les indicateurs, puis les met en place dans vos onglets." },
  { slug: "identity", description: "Mission, valeurs, positionnement, cibles et objectifs : les fondations de la marque.", label: "Identité de marque", ready: true, feature: "identity" as Feature, pitch: "" },
  { slug: "personas", description: "Les publics à toucher : leurs besoins, leurs freins, la façon de leur parler et ce qui les pousse à agir.", label: "Cibles & personas", ready: true, feature: "identity" as Feature, pitch: "" },
  { slug: "charter", description: "Couleurs, typographie, règles du logo et style de visuels : le cadre à remettre à un graphiste ou à un partenaire.", label: "Charte graphique", ready: true, feature: "identity" as Feature, pitch: "" },
  { slug: "audit", description: "Analysez vos captures et PDF pour obtenir un score et des priorités d’amélioration.", label: "Audit", ready: true, feature: "audit" as Feature, pitch: "Analysez vos captures et PDF : score, points forts et priorités d'amélioration, en cohérence avec votre positionnement." },
  { slug: "pillars", description: "Les grands thèmes de contenu qui structurent toutes vos publications.", label: "Piliers de contenu", ready: true, feature: "pillars" as Feature, pitch: "" },
  { slug: "tone", description: "La voix de la marque : ce qu’on dit, et ce qu’on évite.", label: "Tonalité & voix", ready: true, feature: "tone" as Feature, pitch: "" },
  { slug: "editorial", description: "Votre trame hebdomadaire par canal, avec rotation des piliers et validation.", label: "Ligne éditoriale", ready: true, feature: "editorial" as Feature, pitch: "Une trame hebdomadaire par canal, avec rotation de vos piliers et workflow de validation." },
  { slug: "posts", description: "Toutes vos publications, tous réseaux : vue mois, kanban ou liste, statuts et circuit de validation.", label: "Calendrier éditorial", ready: true, feature: "editorial" as Feature, pitch: "Des publications prêtes à poster, rédigées à partir de votre ligne éditoriale, placées sur un calendrier." },
  { slug: "library", optional: true, description: "Fichiers, dossiers de médias, modèles Canva et Figma, charte graphique : tout au même endroit.", label: "Médiathèque", ready: true, feature: "library" as Feature, pitch: "Rangez les logos, photos, visuels et documents de chaque marque au même endroit, prêts à être retrouvés et téléchargés." },
  { slug: "ideas", optional: true, description: "Toutes vos idées au même endroit : idées brutes, veille, concurrents, suggestions de l'IA, et leur passage en publication.", label: "Banque d'idées", ready: true, feature: "identity" as Feature, pitch: "" },
  { slug: "organic", optional: true, description: "Des leviers de portée sans budget publicitaire, chacun avec une action concrète à cocher.", label: "Stratégie organique", ready: true, feature: "editorial" as Feature, pitch: "Douze leviers pour toucher plus de monde sans budget publicitaire, chacun avec une action concrète, datée et à cocher." },
  { slug: "community", optional: true, description: "Réponses types, scripts, gestion de crise et suivi des interactions : modérer sans improviser.", label: "Communauté & modération", ready: true, feature: "rules" as Feature, pitch: "Réponses types, scripts pour les situations difficiles, protocole de crise et suivi des interactions chaudes." },
  { slug: "kpi", description: "Saisie mensuelle, échéance et export PDF de vos rapports de performance.", label: "Performance", ready: true, feature: "kpi" as Feature, pitch: "Saisie mensuelle, rappel d'échéance et export PDF de vos rapports de performance." },
  { slug: "rules", description: "Les règles de travail de la marque, section par section.", label: "Règles opérationnelles", ready: true, feature: "rules" as Feature, pitch: "Centralisez les règles de travail de chaque marque : planning, visuels, communauté, confidentialité." },
  { slug: "lives", description: "Préparez vos lives : trame, équipe, scripts et réponses rapides.", label: "Guide Lives", ready: true, feature: "lives" as Feature, pitch: "Préparez vos lives : trame par objectif, équipe, scripts et réponses rapides en un clic." },
] as const;

export type TabSlug = (typeof TABS)[number]["slug"];

/** Regroupement de la navigation : ce qu'on définit, ce qu'on produit, ce qu'on mesure. */
export const TAB_GROUPS = [
  { id: "strategie", label: "Stratégie" },
  { id: "production", label: "Production" },
  { id: "analyse", label: "Analyse" },
] as const;
export type TabGroupId = (typeof TAB_GROUPS)[number]["id"];

export const TAB_GROUP: Record<TabSlug, TabGroupId> = {
  plan: "strategie",
  identity: "strategie",
  personas: "strategie",
  ideas: "strategie",
  charter: "strategie",
  pillars: "strategie",
  tone: "strategie",
  organic: "strategie",
  rules: "strategie",
  editorial: "production",
  posts: "production",
  library: "production",
  lives: "production",
  community: "production",
  audit: "analyse",
  kpi: "analyse",
};
