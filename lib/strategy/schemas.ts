import { z } from "zod";
import { ROLES } from "../plan/schemas";

const text = z.string().min(1).max(1500);

/** Objectif prioritaire de communication : le point de départ de toute la stratégie. */
export const PRIORITIES = ["notoriete", "ventes", "communaute", "partenaires", "dons", "autre"] as const;
export type Priority = (typeof PRIORITIES)[number];
export const PRIORITY_LABEL: Record<Priority, string> = {
  notoriete: "Développer la notoriété",
  ventes: "Augmenter les ventes ou les commandes",
  communaute: "Développer et fidéliser la communauté",
  partenaires: "Obtenir des partenaires",
  dons: "Obtenir des dons ou mobiliser des soutiens",
  autre: "Autre objectif",
};

// ───────────────────────────── Personas ─────────────────────────────
export const personaOut = z.object({
  name: z.string().min(1).max(200),
  profile: text,
  needs: text,
  frictions: text,
  tone: text,
  levers: text,
  channels: z.array(z.string().max(40)).max(6).default([]),
  priority: z.enum(["principal", "secondaire"]).default("secondaire"),
});
export const personasOutput = z.object({ personas: z.array(personaOut).min(2).max(6) });
export type PersonasOutput = z.infer<typeof personasOutput>;

// ───────────────────────────── Piliers ─────────────────────────────
export const pillarsBrief = z.object({ priority: z.enum(PRIORITIES).default("notoriete"), problem: z.string().max(800).default("") });
export type PillarsBrief = z.infer<typeof pillarsBrief>;

export const strategyPillar = z.object({
  name: z.string().min(1).max(200),
  role: z.enum(ROLES),
  pct: z.number().int().min(3).max(60),
  objective: text,
  personas: z.array(z.string().max(200)).max(6).default([]),
  rationale: text,
  subthemes: z.array(z.string().min(1).max(300)).min(2).max(8),
  formats: z.array(z.string().min(1).max(200)).min(1).max(8),
  cta: text,
  kpi: text,
});
export const diagnosticOut = z.object({ problem: text, priority_objective: text, hypotheses: z.array(z.string().min(1).max(600)).min(1).max(5) });
export const pillarsStrategyOutput = z.object({ diagnostic: diagnosticOut, pillars: z.array(strategyPillar).min(3).max(7) });
export type PillarsStrategyOutput = z.infer<typeof pillarsStrategyOutput>;
export type Diagnostic = z.infer<typeof diagnosticOut> & { input?: PillarsBrief };

// ───────────────────────────── Idées ─────────────────────────────
export const ideasOutput = z.object({
  ideas: z.array(z.object({ title: z.string().min(1).max(400), subtheme: z.string().max(300).default(""), format: z.string().max(100).default(""), networks: z.array(z.string().max(40)).max(4).default([]), angle: z.string().max(800).default("") })).min(3).max(12),
});
export type IdeasOutput = z.infer<typeof ideasOutput>;
export const IDEA_SOURCES = ["idee", "veille", "benchmark", "terrain", "ia"] as const;
export type IdeaSource = (typeof IDEA_SOURCES)[number];
export const IDEA_SOURCE_LABEL: Record<IdeaSource, string> = { idee: "Idée brute", veille: "Veille de tendance", benchmark: "Benchmark concurrent", terrain: "Retour du terrain", ia: "Suggestion de l'IA" };
export const IDEA_STATUSES = ["a_trier", "retenue", "produite", "ecartee"] as const;
export type IdeaStatus = (typeof IDEA_STATUSES)[number];
export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = { a_trier: "À trier", retenue: "Retenue", produite: "Produite", ecartee: "Écartée" };
