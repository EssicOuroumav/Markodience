import { z } from "zod";

export const ASSISTANT_TASKS = ["analyse", "recommandations", "reponse", "risques", "rapport"] as const;
export type AssistantTask = (typeof ASSISTANT_TASKS)[number];
export const TASK_INFO: Record<AssistantTask, { label: string; hint: string; needsInput: boolean; inputLabel?: string }> = {
  analyse: { label: "Analyser ma performance", hint: "Lit vos indicateurs, vos publications et vos audits, et dit ce qui progresse, ce qui bloque et pourquoi.", needsInput: false },
  recommandations: { label: "Mes prochaines priorités", hint: "Cinq recommandations classées par urgence, chacune avec la raison et la première action.", needsInput: false },
  reponse: { label: "Répondre à un message", hint: "Collez un commentaire ou un message : trois réponses dans la voix de la marque, fidèles à vos réponses types.", needsInput: true, inputLabel: "Le message ou commentaire reçu" },
  risques: { label: "Gestion des risques", hint: "Les risques de réputation, de planning et de dépendance de votre plan, avec comment les éviter.", needsInput: false },
  rapport: { label: "Rapport pour la direction", hint: "Un rapport mensuel rédigé : résultats, enseignements, actions, à remettre à la direction ou au client.", needsInput: false },
};

const t = (n: number) => z.string().trim().min(1).max(n);
export const assistantOutput = z.object({
  title: t(200),
  summary: t(1200),
  sections: z.array(z.object({ heading: t(200), body: t(2500) })).min(1).max(8),
  actions: z.array(t(400)).max(8).default([]),
});
export type AssistantOutput = z.infer<typeof assistantOutput>;

export const MAX_INPUT = 1500;

export const mockAssistant = (task: AssistantTask): AssistantOutput => ({
  title: TASK_INFO[task].label,
  summary: "Synthèse simulée : les indicateurs avancent, un seuil d'alerte demande une action cette semaine.",
  sections: [
    { heading: "Ce qui progresse", body: "Les publications validées sont publiées à l'heure et l'engagement augmente sur le réseau principal." },
    { heading: "Ce qui bloque", body: "Un indicateur est sous son seuil d'alerte : la cause probable est le rythme de relance des partenaires." },
  ],
  actions: ["Relancer les partenaires cette semaine.", "Refaire un audit du réseau principal dans trente jours."],
});
