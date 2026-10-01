import { addMonths } from "../editorial";
import type { PlanId } from "../plans";
import { getProvider } from "./index";
import { createAdminClient } from "./admin";

export type ConfirmOutcome =
  | { ok: true; plan: PlanId; already: boolean }
  | { ok: false; reason: "unknown_payment" | "not_paid" | "amount_mismatch" | "not_configured" | "error" };

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Confirme un paiement : la vérité vient du prestataire (verify), jamais du client ni du corps
 * du webhook. Idempotent : le webhook et la page de retour peuvent l'appeler tous les deux.
 */
export async function confirmPayment(lookup: { token?: string; ref?: string }): Promise<ConfirmOutcome> {
  try {
    const admin = createAdminClient();
    const q = admin.from("payments").select("id, user_id, plan, seats, amount, provider, provider_token, status");
    const { data: payment } = await (lookup.ref ? q.eq("id", lookup.ref) : q.eq("provider_token", lookup.token ?? "")).maybeSingle();
    if (!payment || !payment.provider_token) return { ok: false, reason: "unknown_payment" };
    if (payment.status === "completed") return { ok: true, plan: payment.plan as PlanId, already: true };

    const resolved = getProvider();
    if ("error" in resolved) return { ok: false, reason: "not_configured" };
    const v = await resolved.provider.verify(payment.provider_token);

    if (v.status === "cancelled" || v.status === "failed") {
      await admin.from("payments").update({ status: v.status }).eq("id", payment.id).eq("status", "pending");
      return { ok: false, reason: "not_paid" };
    }
    if (v.status !== "completed") return { ok: false, reason: "not_paid" };
    if (v.amount !== payment.amount || (v.ref !== null && v.ref !== payment.id)) return { ok: false, reason: "amount_mismatch" };

    // Transition atomique pending -> completed : un seul appelant active l'abonnement.
    const { data: claimed } = await admin
      .from("payments")
      .update({ status: "completed", confirmed_at: new Date().toISOString() })
      .eq("id", payment.id)
      .eq("status", "pending")
      .select("id")
      .maybeSingle();
    if (!claimed) return { ok: true, plan: payment.plan as PlanId, already: true };

    const start = today();
    const { error } = await admin.from("subscriptions").upsert(
      {
        user_id: payment.user_id,
        plan: payment.plan,
        seats: payment.seats,
        status: "active",
        payment_provider: payment.provider,
        provider_transaction_id: payment.provider_token,
        current_period_start: start,
        current_period_end: addMonths(start, 1),
        renewal_date: addMonths(start, 1),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      // On rend le paiement rejouable plutôt que de perdre l'activation.
      await admin.from("payments").update({ status: "pending", confirmed_at: null }).eq("id", payment.id);
      return { ok: false, reason: "error" };
    }
    return { ok: true, plan: payment.plan as PlanId, already: false };
  } catch {
    return { ok: false, reason: "error" };
  }
}
