import type { LiveScriptsOutput, LiveStructureOutput, AuditOutput, EditorialOutput, IdentityOutput, PillarsOutput, ToneOutput } from "./schemas";

// Réponses de développement (AI_MOCK=1) : permettent de tester sans crédit API.
export const mockIdentity = (): IdentityOutput => ({
  positioning: "Une marque de proximité qui rend son offre simple, fiable et accessible à tout son public.",
  target_segments: [
    { name: "Jeunes actifs urbains", description: "25-35 ans, connectés, sensibles au rapport qualité-prix.", need: "Gagner du temps avec une offre fiable." },
  ],
  visual_palette: [
    { color: "#0071E3", usage: "Couleur principale, boutons et titres" },
    { color: "#1D1D1F", usage: "Texte" },
    { color: "#F5F5F7", usage: "Fonds" },
  ],
  marketing_objectives: [
    { text: "Gagner 1 000 abonnés qualifiés en 3 mois", indicator: { label: "Nouveaux abonnés", unit: "abonnés", mode: "cumulative", builtin: "new_followers" }, target: 1000 },
    { text: "Collecter 100 contacts WhatsApp par mois", indicator: { label: "Contacts WhatsApp", unit: "contacts", mode: "monthly", builtin: null }, target: 100 },
    { text: "Publier un bilan visuel chaque trimestre", check: { frequency: "quarterly" } },
  ],
});

export const mockPillars = (): PillarsOutput => ({
  pillars: [
    { name: "Éducation", description: "Conseils pratiques pour le public.", examples: ["Carrousel 5 astuces", "Vidéo courte tutoriel"] },
    { name: "Preuve sociale", description: "Témoignages et résultats concrets.", examples: ["Témoignage en image", "Avant/après"] },
    { name: "Coulisses", description: "Montrer l'équipe et le savoir-faire.", examples: ["Story du quotidien", "Live découverte"] },
  ],
});

export const mockTone = (): ToneOutput => ({
  do_list: ["Tutoyer avec respect", "Phrases courtes", "Exemples concrets locaux", "Ton chaleureux"],
  dont_list: ["Jargon technique", "Promesses exagérées", "Majuscules criardes", "Sujets polémiques"],
});

export const mockEditorial = (weeks: number): EditorialOutput => ({
  entries: Array.from({ length: weeks }, (_, i) => ({
    week_number: i + 1,
    theme: `Thème de la semaine ${i + 1}`,
    content_type: ["Éducatif", "Preuve sociale", "Coulisses"][i % 3],
    format: ["Carrousel", "Vidéo courte", "Photo + texte", "Live"][i % 4],
    frequency: "3 publications par semaine",
    suggested_time: "18h30",
  })),
});

export const mockAudit = (): AuditOutput => ({
  score: 72,
  summary: "Une présence cohérente avec le positionnement, mais des visuels et des appels à l'action à renforcer.",
  strengths: [
    { title: "Ton chaleureux", description: "La voix de la marque est reconnaissable et proche de la cible." },
    { title: "Visuels lisibles", description: "Les couleurs de la charte sont respectées sur la majorité des supports." },
  ],
  improvements: [
    { title: "Appels à l'action absents", description: "Peu de publications invitent à commander ou écrire en message privé.", priority: "eleve" },
    { title: "Régularité de publication", description: "Les créneaux de publication varient fortement d'une semaine à l'autre.", priority: "modere" },
    { title: "Hashtags", description: "Utiliser un petit jeu de hashtags de marque stable.", priority: "faible" },
  ],
});

export const mockLiveStructure = (): LiveStructureOutput => ({
  steps: [
    { time_range: "0-5 min", title: "Ouverture", description: "Accueillir l'audience et annoncer le programme du live." },
    { time_range: "5-20 min", title: "Cœur du live", description: "Présenter le contenu principal avec des exemples concrets." },
    { time_range: "20-30 min", title: "Questions", description: "Répondre aux questions posées en commentaires." },
    { time_range: "30-35 min", title: "Clôture", description: "Résumer, remercier et inviter à l'action." },
  ],
});
export const mockLiveScripts = (): LiveScriptsOutput => ({
  scripts: [
    { situation: "Premier message entrant", content: "Bonjour et bienvenue ! Comment puis-je vous aider ?" },
    { situation: "Redirection vers un autre membre", content: "Je transmets votre demande à [prénom], qui vous répond tout de suite." },
    { situation: "Relance", content: "Toujours intéressé(e) ? Il reste quelques minutes pour en profiter." },
    { situation: "Clôture", content: "Merci d'avoir suivi le live ! Écrivez-nous en message privé pour la suite." },
  ],
  quick_replies: [
    { situation: "Prix", content: "Le prix est de [prix] FCFA, livraison incluse." },
    { situation: "Disponibilité", content: "Oui, disponible ! Dites-moi votre ville pour la livraison." },
  ],
});
