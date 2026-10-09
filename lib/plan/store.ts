import type { Brief } from "./brief";
import { PHASE_LABEL, type Week } from "./calendar";
import { WEEKDAYS, weekdaysIn } from "./networks";
import type { Draft, NetworkResult } from "./stages";
import { rowsFor } from "./pipeline";
import type * as S from "./schemas";
import { addDays } from "../posts";

/** Étapes de construction, dans l'ordre. « network » se répète pour chaque réseau. */
export const STAGES = ["start", "identity", "pillars", "calendar", "network", "organic", "kpi", "rules", "review", "apply"] as const;
export type PlanStage = (typeof STAGES)[number];

export const STAGE_LABEL: Record<PlanStage, string> = {
  start: "Préparation",
  identity: "Identité de marque",
  pillars: "Piliers de contenu",
  calendar: "Calendrier de l'année",
  network: "Lignes éditoriales par réseau",
  organic: "Stratégie organique",
  kpi: "Indicateurs de suivi",
  rules: "Règles opérationnelles",
  review: "Relecture critique",
  apply: "Mise en place dans vos onglets",
};

/** Combien de fois une même étape peut être relancée au cours d'une construction (protège le coût). */
export const MAX_STAGE_RUNS = 2;
/** Crédits quotidiens consommés par une construction (une seule fois, à la préparation) et par l'extraction de la fiche. */
export const CREDITS = { extract: 1, start: 4 } as const;

export type StoredDraft = Partial<Omit<Draft, "networks">> & {
  brief: Brief;
  networks?: Record<string, NetworkResult>;
  stage_runs: Record<string, number>;
  checks?: unknown;
  critique?: S.CritiqueStage;
  started_at: string;
};

export const draftNetworks = (d: StoredDraft, brief: Brief): NetworkResult[] => brief.networks.map((n) => d.networks?.[n.name]).filter((x): x is NetworkResult => !!x);

/** Étapes déjà faites d'un brouillon (pour reprendre après une coupure). */
export function completedStages(d: StoredDraft | null): string[] {
  if (!d) return [];
  const done = ["start"];
  if (d.identity) done.push("identity");
  if (d.pillars) done.push("pillars");
  if (d.themes) done.push("calendar");
  for (const n of d.brief.networks) if (d.networks?.[n.name]) done.push(`network:${n.name}`);
  if (d.organic) done.push("organic");
  if (d.kpi) done.push("kpi");
  if (d.rules) done.push("rules");
  if (d.critique) done.push("review");
  return done;
}

/** Liste ordonnée des étapes d'une construction pour ce cahier des charges (une étape par réseau). */
export function buildSteps(brief: Brief): { key: string; stage: PlanStage; network?: string; label: string }[] {
  return [
    { key: "identity", stage: "identity", label: STAGE_LABEL.identity },
    { key: "pillars", stage: "pillars", label: STAGE_LABEL.pillars },
    { key: "calendar", stage: "calendar", label: STAGE_LABEL.calendar },
    ...brief.networks.map((n) => ({ key: `network:${n.name}`, stage: "network" as const, network: n.name, label: `Ligne éditoriale ${n.name}` })),
    { key: "organic", stage: "organic", label: STAGE_LABEL.organic },
    { key: "kpi", stage: "kpi", label: STAGE_LABEL.kpi },
    { key: "rules", stage: "rules", label: STAGE_LABEL.rules },
    { key: "review", stage: "review", label: STAGE_LABEL.review },
    { key: "apply", stage: "apply", label: STAGE_LABEL.apply },
  ];
}

// ───────────────────────────── Mise en place dans les onglets (lignes à écrire) ─────────────────────────────

const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
const dayIndex = (day: string) => Math.max(0, WEEKDAYS.findIndex((d) => d === weekdaysIn(day)[0]));

export type ApplyRows = {
  identity: Record<string, unknown>;
  pillars: Record<string, unknown>[];
  tone: { do_list: string[]; dont_list: string[] };
  lines: {
    channel: string;
    period_start: string;
    period_end: string;
    entries: { week_number: number; position: number; theme: string; content_type: string; format: string; frequency: string; suggested_time: string; status: string; validation_status: string; phase: string; campaign: string | null }[];
    posts: { week_number: number; channel: string; scheduled_date: string; idea: string; hook: string; pillar: string; format: string }[];
  }[];
};

/** Transforme le plan en lignes pour les tables existantes. Fonction pure : testée sans base. */
export function planToRows(brief: Brief, d: Draft, weeks: Week[]): ApplyRows {
  const phaseWeeks = weeks.map((w) => ({ ...w, theme: d.themes[w.index - 1]?.theme ?? "[thème à définir]", pillar: d.themes[w.index - 1]?.pillar ?? "" }));
  const first = weeks[0].start;
  const last = weeks[weeks.length - 1].end;
  return {
    identity: {
      positioning: d.identity.mission,
      foundations: { mission: d.identity.mission, vision: "", values: d.identity.values.map((v) => ({ name: v.name, description: v.text })), promise: "", slogan: d.identity.tagline, key_message: "" },
      tone_table: d.identity.tone_table,
      rewrite: d.identity.rewrite,
      logo_note: d.identity.logo_note,
    },
    pillars: d.pillars.pillars.map((p) => ({ name: p.title, description: p.purpose, examples: split(p.formats), pct: p.pct, role: p.role })),
    tone: { do_list: d.identity.tone_table.map((t) => t.do).slice(0, 9), dont_list: d.identity.tone_table.map((t) => t.dont).slice(0, 9) },
    lines: d.networks.map((n) => ({
      channel: n.profile.network,
      period_start: first,
      period_end: last,
      entries: phaseWeeks.map((w) => ({
        week_number: w.index,
        position: w.index - 1,
        theme: w.theme,
        content_type: PHASE_LABEL[w.phase].replace(/ \(.*\)$/, ""),
        format: [...new Set(n.templates[w.phase].map((r) => r.format))].join(", ").slice(0, 120),
        frequency: n.profile.frequency,
        suggested_time: n.profile.best_hours,
        status: "a_venir",
        validation_status: "non_requis",
        phase: w.phase,
        campaign: w.campaign,
      })),
      posts: phaseWeeks.flatMap((w) =>
        rowsFor(w, n.templates).map((r) => ({
          week_number: w.index,
          channel: n.profile.network,
          scheduled_date: addDays(w.start, dayIndex(r.day)),
          idea: r.idea,
          hook: r.hook,
          pillar: r.pillar,
          format: r.format,
        })),
      ),
    })),
  };
}
