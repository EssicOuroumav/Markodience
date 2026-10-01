import type { EditorialOutput, IdentityOutput, PillarsOutput, ToneOutput } from "./schemas";

// Réponses de développement (AI_MOCK=1) : permettent de tester sans crédit API.
export const mockIdentity = (): IdentityOutput => ({
  positioning: "Une marque de proximité qui rend son offre simple, fiable et accessible à tous ses clients.",
  target_segments: [
    { name: "Jeunes actifs urbains", description: "25-35 ans, connectés, sensibles au rapport qualité-prix.", need: "Gagner du temps avec une offre fiable." },
  ],
  visual_palette: [
    { color: "#0071E3", usage: "Couleur principale, boutons et titres" },
    { color: "#1D1D1F", usage: "Texte" },
    { color: "#F5F5F7", usage: "Fonds" },
  ],
  marketing_objectives: ["Gagner 1 000 abonnés qualifiés en 3 mois", "Augmenter l'engagement de 20 %", "Générer 30 demandes par mois"],
});

export const mockPillars = (): PillarsOutput => ({
  pillars: [
    { name: "Éducation", description: "Conseils pratiques pour les clients.", examples: ["Carrousel 5 astuces", "Vidéo courte tutoriel"] },
    { name: "Preuve sociale", description: "Témoignages et résultats clients.", examples: ["Avis client en image", "Avant/après"] },
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
