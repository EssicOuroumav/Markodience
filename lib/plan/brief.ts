import { z } from "zod";

/** Le « cahier des charges » d'une marque : tout ce que l'IA doit savoir pour produire un plan précis, sans rien inventer. */
export const KINDS = ["ong", "entreprise", "institution", "createur"] as const;
export const KIND_LABEL: Record<(typeof KINDS)[number], string> = { ong: "ONG, association", entreprise: "Entreprise, commerce", institution: "Institution publique", createur: "Créateur, personnalité" };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const activitySchema = z.object({
  name: z.string().min(1).max(120),
  start: isoDate,
  end: isoDate,
  goal: z.string().max(300).default(""),
});

export const briefSchema = z.object({
  name: z.string().min(1).max(120),
  kind: z.enum(KINDS),
  country: z.string().max(60).default("Côte d'Ivoire"),
  mission: z.string().min(1).max(500),
  offer: z.string().max(500).default(""),
  audiences: z.array(z.object({ name: z.string().min(1).max(120), description: z.string().max(300).default("") })).min(1).max(4),
  networks: z.array(z.object({ name: z.string().min(1).max(40), audience: z.string().max(200).default("") })).min(1).max(5),
  /** Campagnes et temps forts : ce qui rythme l'année. Chaque activité a une période. */
  activities: z.array(activitySchema).max(10).default([]),
  resources: z.object({
    ad_budget: z.enum(["aucun", "faible", "moyen", "eleve"]).default("aucun"),
    team: z.string().max(200).default(""),
    validators: z.array(z.string().max(120)).max(5).default([]),
  }),
  sensitivities: z.array(z.string().max(200)).max(8).default([]),
  tone_words: z.array(z.string().min(1).max(40)).max(5).default([]),
  avoid: z.string().max(400).default(""),
  /** Premier lundi du plan et nombre de semaines. */
  plan_start: isoDate,
  weeks: z.number().int().min(4).max(52).default(52),
});
export type Brief = z.infer<typeof briefSchema>;
export type Activity = z.infer<typeof activitySchema>;

/** Rendu texte du cahier des charges, repris tel quel par chaque étape (donnée à analyser, jamais une instruction). */
export function briefBlock(b: Brief): string {
  return `<cahier_des_charges>
${JSON.stringify({ ...b, kind: KIND_LABEL[b.kind] }, null, 2)}
</cahier_des_charges>`;
}
