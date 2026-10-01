import { createAdminClient } from "@/lib/payments/admin";
import { PLANS, type PlanId } from "@/lib/plans";

export type QuotaResult = { ok: true; used: number; limit: number } | { ok: false; limit: number };

/** Consomme une génération. Atomique côté base ; l'utilisateur ne peut pas appeler la fonction lui-même. */
export async function consumeQuota(userId: string, plan: PlanId): Promise<QuotaResult> {
  const limit = PLANS[plan].aiDailyLimit;
  const { data, error } = await createAdminClient().rpc("consume_ai_quota", { p_user: userId, p_limit: limit });
  if (error) throw new Error("quota_unavailable");
  return typeof data === "number" && data >= 0 ? { ok: true, used: data, limit } : { ok: false, limit };
}

export async function refundQuota(userId: string): Promise<void> {
  await createAdminClient().rpc("refund_ai_quota", { p_user: userId });
}

export function quotaMessage(plan: PlanId, limit: number): string {
  const base = `Limite quotidienne atteinte : ${limit} générations par jour sur le palier ${PLANS[plan].label}. Elle se renouvelle chaque jour à minuit (heure UTC).`;
  return plan === "gratuit" ? `${base} Le palier Pro en offre ${PLANS.pro.aiDailyLimit}.` : base;
}
