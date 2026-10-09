import type { Brief } from "./brief";
import type { Week } from "./calendar";
import type { Extract } from "./extract";
import type * as S from "./schemas";

/** Réponses de développement (AI_MOCK=1) : tout le parcours se teste sans crédit. Textes courts, mais valides. */
export const mockExtract = (text: string): Extract => ({
  name: text.split(/[\s,.;:]+/).find((w) => w.length > 2) ?? "Ma marque",
  kind: "ong",
  mission: "Porter secours aux familles vulnérables par des actions mesurables.",
  tagline: "",
  offer: "Kits scolaires, dépistages, paniers alimentaires.",
  audiences: [{ name: "Donateurs fidèles", description: "Adultes, diaspora" }, { name: "Jeunes urbains", description: "18-30 ans" }],
  networks: [{ name: "Facebook", audience: "Donateurs" }, { name: "Instagram", audience: "Jeunes" }, { name: "TikTok", audience: "Plus jeunes" }],
  activities: [
    { name: "Campagne de rentrée", start: "2026-10-19", end: "2026-11-15", goal: "Collecter des kits scolaires" },
    { name: "Campagne de santé", start: "2027-01-11", end: "2027-02-07", goal: "Dépistage gratuit" },
  ],
  resources: { ad_budget: "aucun", team: "Un community manager et des bénévoles", validators: ["Direction Communication"] },
  sensitivities: ["Mineurs et consentement", "Neutralité politique"],
  tone_words: ["digne", "rigoureux", "chaleureux"],
  avoid: "Politique, misérabilisme",
  decisions: ["Aucune publicité payante"],
  gaps: [{ field: "tagline", question: "Votre organisation a-t-elle un slogan ?" }, { field: "team", question: "Combien de bénévoles actifs pouvez-vous mobiliser ?" }],
  assumptions: ["« avant la rentrée » → collecte du 2026-10-19 au 2026-11-15 (à confirmer)"],
});

export const mockIdentityStage = (b: Brief): S.IdentityStage => ({
  mission: `${b.name} agit pour les personnes vulnérables, avec des actions datées et des bilans chiffrés.`,
  tagline: b.tagline || "Agir avec dignité",
  tagline_status: b.tagline ? "fourni" : "propose",
  commitments: { report_days: 7, reply_hours: 24, validation_hours: 48, health_review_hours: 72 },
  values: [
    { name: "Dignité", text: "Aucune image de détresse ; les personnes sont montrées debout, avec leur accord." },
    { name: "Rigueur", text: "Chaque appel annonce un objectif chiffré et un bilan sous 7 jours." },
    { name: "Proximité", text: "Réponse à chaque message sous 24 h, avec un ton chaleureux." },
    { name: "Neutralité", text: "Aucune prise de position politique ou partisane." },
  ],
  tone_table: [
    { register: "Image des personnes", do: "Cadrer l'action, les mains, le geste de remise", dont: "Gros plan sur la détresse" },
    { register: "Mineurs", do: "Accord écrit du tuteur avant publication", dont: "Visage ou nom sans accord" },
    { register: "Appel au don", do: "Objectif chiffré, date de clôture, moyen de don", dont: "Urgence permanente, culpabilisation" },
    { register: "Santé", do: "Relecture par le référent médical", dont: "Conseil médical improvisé" },
    { register: "Politique", do: "Rester sur l'action du jour", dont: "Partager du contenu partisan" },
  ],
  rewrite: { avoid: "Aidez ces pauvres enfants avant qu'il ne soit trop tard !", follow: "Du 19 octobre au 15 novembre, nous réunissons [X] kits scolaires. Donnez un kit ou son équivalent." },
  logo_note: "Zone de protection libre autour du logo. Versions claire, blanche et noire. Aucune déformation ni recoloration.",
});

export const mockPillarsStage = (): S.PillarsStage => ({
  pillars: [
    { title: "Preuves d'action terrain", role: "preuve", pct: 30, purpose: "Montrer chaque opération pour prouver le travail réalisé.", formats: "Reportages photo, vidéos courtes, albums" },
    { title: "Transparence et bilans", role: "transparence", pct: 20, purpose: "Rendre compte de chaque collecte, chiffres à l'appui.", formats: "Infographies, bilans chiffrés" },
    { title: "Appels à agir", role: "appel", pct: 20, purpose: "Convertir l'attention en dons ou en bénévolat.", formats: "Comptes à rebours, objectifs chiffrés" },
    { title: "Voix des familles", role: "voix", pct: 15, purpose: "Donner la parole avec respect et consentement.", formats: "Témoignages, portraits" },
    { title: "Santé et éducation utiles", role: "pedagogie", pct: 15, purpose: "Rester utile même sans activité terrain.", formats: "Carrousels, questions-réponses" },
  ],
});

export const mockThemesStage = (weeks: Week[]): S.ThemesStage => ({
  themes: weeks.map((w) => ({ week: w.index, theme: w.campaign ? `${w.campaign} : étape ${w.index}` : `Contenu utile semaine ${w.index}` })),
});

const row = (day: string, pillar: string, format: string, idea: string, hook: string) => ({ day, pillar, format, idea, hook });
export const mockNetworkStage = (name: string, days: string[]): S.NetworkStage => ({
  network: name,
  headline: `${name} : le rôle de ce réseau pour la marque`,
  lead: "Public visé et ce que le réseau porte, en deux phrases courtes.",
  frequency: `3 publications par semaine : ${days.join(", ").toLowerCase()}`,
  format: "Formats et dimensions prioritaires du réseau",
  best_hours: "12h-13h ou 19h-20h, heure locale",
  rules_title: `Règles ${name}`,
  rules: [
    { label: "Légende", text: "L'accroche tient dans les deux premières lignes." },
    { label: "Mineurs", text: "Aucun visage d'enfant sans accord écrit du tuteur." },
    { label: "Santé", text: "Tout contenu santé est relu avant publication." },
    { label: "Neutralité", text: "Aucun sujet politique." },
  ],
  method: `${days[0]} : preuve. ${days[1] ?? days[0]} : éclairage. ${days[2] ?? days[0]} : appel.`,
});
export const mockTemplatesStage = (name: string, days: string[], pillars: string[]): S.TemplatesStage => {
  const rows = (fmt: string) => days.slice(0, 3).map((d, i) => row(d, pillars[i % pillars.length], fmt, `Publication du ${d.toLowerCase()} sur {theme} pour ${name}.`, `{theme} : voici où nous en sommes.`));
  return { network: name, avant: rows("Carrousel"), pendant: rows("Album photo"), apres: rows("Infographie"), evergreen: rows("Photo + texte") };
};

export const mockOrganicStage = (): S.OrganicStage => ({
  levers: Array.from({ length: 10 }, (_, i) => ({ title: `Levier ${i + 1}`, why: "Un relais de proximité qui touche sans budget publicitaire.", action: `Contacter viser environ ${i + 3} relais cette semaine` })),
});

export const mockKpiStage = (b: Brief): S.KpiStage => ({
  intro: "Fourchettes indicatives, à recalibrer après 90 jours de publication réelle.",
  rows: ["Dons attribués aux publications", "Actions réalisées", "Taux d'engagement", "Portée hebdomadaire", "Nouveaux bénévoles", "Messages traités sous 24 h"].map((indicator) => ({
    indicator,
    by_network: b.networks.map((n) => ({ network: n.name, target: "[X] à recalibrer" })),
    cadence: "Chaque vendredi",
  })),
  cadences: [
    { title: "Équipe", text: "Chaque vendredi, 30 minutes : portée, engagement, décisions de la semaine." },
    { title: "Direction", text: "Chaque mois, une page : résultats, dons, incidents, ajustements." },
    { title: "Bilan de campagne", text: "Sous 7 jours après chaque clôture, chiffres terrain validés." },
  ],
});

export const mockRulesStage = (): S.RulesStage => ({
  rules: [
    { title: "Consentement des mineurs", text: "Accord écrit du tuteur archivé avant toute publication.", tag: "Éthique" },
    { title: "Circuit de validation", text: "Brouillon, validation Direction sous 48 h, publication.", tag: "Process" },
    { title: "Contenus de santé", text: "Relecture du référent médical sous 72 h avant publication.", tag: "Conformité" },
    { title: "Neutralité politique", text: "Aucun contenu partisan, aucun commentaire sur les élus.", tag: "Neutralité" },
    { title: "Dignité des personnes", text: "Montrer l'action, jamais la détresse.", tag: "Identité" },
    { title: "Canal de don unique", text: "Un seul numéro officiel, validé par la Direction.", tag: "Confidentialité" },
    { title: "Réactivité et crise", text: "Réponse sous 24 h ; alerte immédiate en cas de polémique.", tag: "Crise" },
  ],
});

export const mockCritiqueStage = (): S.CritiqueStage => ({
  score: 75,
  verdict: "Plan cohérent et fidèle au cahier des charges. La cadence demande un suivi attentif.",
  strengths: ["Cadre éthique clair", "Engagements chiffrés identiques partout", "Calendrier fidèle aux campagnes"],
  issues: [{ severity: "mineur", stage: "kpi", where: "Cibles de résultats", problem: "Toutes les cibles sont en [X].", fix: "Renseigner les chiffres après 90 jours." }],
  risks: [{ level: "modere", risk: "Un seul community manager porte toute la cadence.", mitigation: "Un tournage par semaine décliné en plusieurs formats." }],
  questions: [{ question: "Combien de bénévoles actifs pouvez-vous mobiliser ?", why: "La cadence réaliste en dépend." }],
});

export const mockCondense = (over: { text: string }[]) => ({ texts: over.map((o) => o.text) });
