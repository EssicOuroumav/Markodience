import { z } from "zod";

/** Les longueurs visées sont dans les consignes. Ici, un simple garde-fou : un texte un peu long n'est jamais rejeté (un rejet coûte une génération entière). */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const text = (_target: number) => z.string().min(1).max(2000);

export const identityStage = z.object({
  mission: text(700),
  tagline: text(120),
  values: z.array(z.object({ name: text(40), text: text(300) })).min(4).max(8),
  /** Tonalité par registre : ce qu'on fait et ce qu'on proscrit, thème par thème. */
  tone_table: z.array(z.object({ register: text(60), do: text(300), dont: text(300) })).min(4).max(9),
  /** Même message écrit à éviter / à suivre. */
  rewrite: z.object({ avoid: text(400), follow: text(400) }),
  logo_note: text(400),
});
export type IdentityStage = z.infer<typeof identityStage>;

export const pillarsStage = z.object({
  pillars: z.array(z.object({ title: text(60), pct: z.number().int().min(3).max(60), purpose: text(300), formats: text(300) })).min(4).max(8),
});
export type PillarsStage = z.infer<typeof pillarsStage>;
/** Les pourcentages doivent faire 100 : le code vérifie, l'IA n'a pas le dernier mot. */
export const pillarsTotal = (p: PillarsStage) => p.pillars.reduce((n, x) => n + x.pct, 0);

export const themesStage = z.object({ themes: z.array(z.object({ week: z.number().int().min(1).max(52), theme: text(160), pillar: text(60) })).min(4).max(52) });
export type ThemesStage = z.infer<typeof themesStage>;

export const networkStage = z.object({
  network: text(40),
  headline: text(120),
  lead: text(400),
  frequency: text(120),
  format: text(160),
  best_hours: text(120),
  rules_title: text(80),
  rules: z.array(z.object({ label: text(40), text: text(300) })).min(4).max(8),
  method: text(400),
});
export type NetworkStage = z.infer<typeof networkStage>;

const row = z.object({ day: text(20), pillar: text(60), format: text(60), idea: text(300), hook: text(200) });
export const templatesStage = z.object({
  network: text(40),
  avant: z.array(row).min(2).max(8),
  pendant: z.array(row).min(2).max(8),
  apres: z.array(row).min(2).max(8),
  evergreen: z.array(row).min(2).max(8),
});
export type TemplatesStage = z.infer<typeof templatesStage>;

export const organicStage = z.object({ levers: z.array(z.object({ title: text(60), why: text(260), action: text(200) })).min(8).max(14) });
export type OrganicStage = z.infer<typeof organicStage>;

export const kpiStage = z.object({
  intro: text(400),
  rows: z.array(z.object({ indicator: text(80), by_network: z.array(z.object({ network: text(40), target: text(80) })).min(1).max(6), cadence: text(40) })).min(4).max(16),
  cadences: z.array(z.object({ title: text(60), text: text(300) })).min(2).max(5),
});
export type KpiStage = z.infer<typeof kpiStage>;

export const rulesStage = z.object({ rules: z.array(z.object({ title: text(60), text: text(360), tag: text(30) })).min(6).max(10) });
export type RulesStage = z.infer<typeof rulesStage>;

export const critiqueStage = z.object({
  score: z.number().min(0).max(100),
  verdict: text(400),
  issues: z.array(z.object({ where: text(80), problem: text(300), fix: text(300) })).max(25),
});
export type CritiqueStage = z.infer<typeof critiqueStage>;
