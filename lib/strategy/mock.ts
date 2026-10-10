import type { IdeasOutput, PersonasOutput, PillarsBrief, PillarsStrategyOutput } from "./schemas";
import type { StrategyContext } from "./prompts";

/** Réponses de développement (AI_MOCK=1). */
export const mockPersonas = (c: StrategyContext): PersonasOutput => ({
  personas: [
    { name: "Donateurs fidèles", profile: "Adultes de 35 à 60 ans, donateurs réguliers, dont la diaspora.", needs: "Voir où va chaque don et recevoir des preuves.", frictions: "Doute sur l'utilisation des fonds, manque de nouvelles.", tone: "Posé, chiffré, reconnaissant ; pas d'urgence permanente.", levers: "Bilan chiffré, photo de la remise, remerciement.", channels: c.brand.networks.slice(0, 2), priority: "principal" },
    { name: "Jeunes relais", profile: "18-30 ans, urbains, actifs sur mobile.", needs: "S'engager simplement, être utiles.", frictions: "Ne savent pas par où commencer.", tone: "Direct, visuel, authentique.", levers: "Vidéo courte, défi à relayer, appel à bénévoles.", channels: c.brand.networks.slice(1, 3), priority: "secondaire" },
    { name: "Partenaires locaux", profile: "Entreprises et institutions de proximité.", needs: "Une action crédible à associer à leur image.", frictions: "Peu de preuves, interlocuteur flou.", tone: "Professionnel, factuel.", levers: "Dossier de présentation, résultats datés.", channels: ["LinkedIn"], priority: "secondaire" },
  ],
});

export const mockPillarsStrategy = (c: StrategyContext, brief: PillarsBrief): PillarsStrategyOutput => {
  const objective = c.identity.objectives[0] ?? "Développer la notoriété";
  const names = c.personas.map((p) => p.name);
  const pick = (i: number) => (names.length ? [names[i % names.length]] : []);
  const mk = (name: string, role: PillarsStrategyOutput["pillars"][number]["role"], pct: number, i: number) => ({
    name, role, pct, objective, personas: pick(i), rationale: `Ce pilier répond au besoin principal du public et sert l'objectif : ${objective.slice(0, 40)}.`,
    subthemes: ["Sous-thème un", "Sous-thème deux", "Sous-thème trois"], formats: ["Carrousel", "Vidéo courte"], cta: "Écrivez-nous en message privé", kpi: "Messages reçus et clics",
  });
  return {
    diagnostic: { problem: brief.problem.trim() || "La visibilité existe mais se transforme peu en résultats.", priority_objective: objective, hypotheses: ["Le message d'appel à l'action est peu visible.", "Le contenu attire un public qui n'est pas la cible."] },
    pillars: [mk("Preuves d'action", "preuve", 30, 0), mk("Transparence et bilans", "transparence", 20, 0), mk("Appels à agir", "appel", 20, 1), mk("Voix des personnes", "voix", 15, 1), mk("Utile au quotidien", "pedagogie", 15, 2)],
  };
};

export const mockIdeas = (count: number, networks: string[]): IdeasOutput => ({
  ideas: Array.from({ length: Math.max(3, Math.min(count, 12)) }, (_, i) => ({
    title: `Idée de publication numéro ${i + 1} : un sujet précis à produire cette semaine`,
    subtheme: "Sous-thème un", format: ["Reel", "Carrousel", "Photo"][i % 3], networks: networks.slice(0, 1), angle: "Répond à un besoin clair du public et se produit avec un téléphone.",
  })),
});
