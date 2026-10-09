import { z } from "zod";

/** Fondations de la marque : ce que dit une organisation d'elle-même, au-delà du positionnement. */
export const foundationsSchema = z.object({
  mission: z.string().min(1).max(600),
  vision: z.string().min(1).max(600),
  values: z.array(z.object({ name: z.string().min(1).max(60), description: z.string().max(400).default("") })).min(1).max(6),
  promise: z.string().min(1).max(400),
  slogan: z.string().max(160).default(""),
  key_message: z.string().max(400).default(""),
});
export type Foundations = z.infer<typeof foundationsSchema>;

/** Charte graphique : les règles qu'on remet à un graphiste, un stagiaire ou un partenaire. */
export const visualGuideSchema = z.object({
  typography: z.object({
    heading: z.object({ font: z.string().min(1).max(60), usage: z.string().max(300).default("") }),
    body: z.object({ font: z.string().min(1).max(60), usage: z.string().max(300).default("") }),
  }),
  logo_rules: z.array(z.string().min(1).max(300)).min(1).max(8),
  imagery_style: z.string().min(1).max(800),
});
export type VisualGuide = z.infer<typeof visualGuideSchema>;

/** Ce que renvoie la génération complémentaire (identités créées avant l'ajout de ces champs). */
export const identityExtendOutput = z.object({ foundations: foundationsSchema, visual_guide: visualGuideSchema });
export type IdentityExtendOutput = z.infer<typeof identityExtendOutput>;

/** Lecture tolérante : renvoie null si la donnée stockée n'a pas la forme attendue. */
export function parseFoundations(v: unknown): Foundations | null {
  const r = foundationsSchema.safeParse(v);
  return r.success ? r.data : null;
}
export function parseVisualGuide(v: unknown): VisualGuide | null {
  const r = visualGuideSchema.safeParse(v);
  return r.success ? r.data : null;
}

/** Textes des fondations affichés dans l'ordre d'un guide de marque. */
export const FOUNDATION_FIELDS = [
  { key: "mission", label: "Mission", hint: "Pourquoi la marque existe, ce qu'elle fait pour son public." },
  { key: "vision", label: "Vision", hint: "Ce que la marque veut voir changer ou devenir à long terme." },
  { key: "promise", label: "Promesse", hint: "Ce que le public peut compter recevoir, à chaque fois." },
  { key: "slogan", label: "Slogan", hint: "La phrase courte que le public retient." },
  { key: "key_message", label: "Message clé", hint: "L'idée à retrouver dans chaque publication." },
] as const;
