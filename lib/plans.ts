/**
 * Source unique des règles de paliers. Toute la logique de gating de l'application
 * lit ce fichier. Seule exception, imposée par la sécurité : les contraintes RLS de
 * `supabase/migrations/20261001000400_plan_gating.sql` répètent maxProfiles et la
 * liste des onglets payants ; `plans.test.ts` vérifie qu'ils restent cohérents.
 */
export type PlanId = "gratuit" | "pro" | "agence";
export type Feature =
  | "identity" | "pillars" | "tone"
  | "audit" | "editorial" | "kpi" | "rules" | "lives"
  | "white_label" | "multi_export";

type PlanDef = {
  label: string;
  price?: number; // XOF / mois
  pricePerSeat?: number; // XOF / siège / mois
  minSeats?: number;
  maxProfiles: number | null; // null = illimité
  features: readonly Feature[];
  exportWatermark: boolean;
  aiDailyLimit: number; // générations IA par jour et par utilisateur (00:00 UTC)
};

const BASE = ["identity", "pillars", "tone"] as const;
const PRO_FEATURES = [...BASE, "audit", "editorial", "kpi", "rules", "lives"] as const;

export const PLANS: Record<PlanId, PlanDef> = {
  gratuit: {
    label: "Gratuit",
    price: 0,
    maxProfiles: 1,
    features: BASE,
    exportWatermark: true,
    aiDailyLimit: 10,
  },
  pro: {
    label: "Pro",
    price: 12000,
    maxProfiles: 3,
    features: PRO_FEATURES,
    exportWatermark: false,
    aiDailyLimit: 60,
  },
  agence: {
    label: "Agence",
    pricePerSeat: 18000,
    minSeats: 2,
    maxProfiles: null,
    features: [...PRO_FEATURES, "white_label", "multi_export"],
    exportWatermark: false,
    aiDailyLimit: 200,
  },
};

export const PLAN_IDS = Object.keys(PLANS) as PlanId[];
export const MAX_SEATS = 50;

export const isPlanId = (v: unknown): v is PlanId => typeof v === "string" && v in PLANS;
export const hasFeature = (plan: PlanId, f: Feature) => PLANS[plan].features.includes(f);
export const canCreateProfile = (plan: PlanId, currentCount: number) => {
  const max = PLANS[plan].maxProfiles;
  return max === null || currentCount < max;
};

/** Fonctionnalités réservées aux paliers payants (= absentes du palier gratuit). */
export const PAID_FEATURES = PLANS.pro.features.filter((f) => !PLANS.gratuit.features.includes(f));

export function normalizeSeats(plan: PlanId, seats: unknown): number | null {
  const n = Number(seats);
  if (!Number.isInteger(n)) return null;
  if (plan === "agence") return n >= (PLANS.agence.minSeats ?? 2) && n <= MAX_SEATS ? n : null;
  return n === 1 ? 1 : null;
}

/** Montant en XOF, toujours recalculé côté serveur. */
export function priceFor(plan: PlanId, seats = 1): number {
  const p = PLANS[plan];
  return p.pricePerSeat ? p.pricePerSeat * seats : (p.price ?? 0);
}

export const formatXof = (n: number) => `${String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ")} XOF`;
