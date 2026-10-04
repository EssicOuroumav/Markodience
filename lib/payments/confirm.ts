import * as Sentry from "@sentry/nextjs";
import type { PlanId } from "../plans";
import { getProvider } from "./index";
import { createAdminClient } from "./admin";

export type ConfirmOutcome =
  | { ok: true; plan: PlanId; already: boolean }
  | { ok: false; reason: "unknown_payment" | "not_paid" | "cancelled" | "amount_mismatch" | "not_configured" | "error" };

/** Signale à Sentry un incident de paiement (identifiants seulement, aucune donnée personnelle). */
function report(message: string, extra: Record<string, unknown>, error?: unknown) {
  Sentry.withScope((scope) => {
    scope.setTag("area", "payment");
    scope.setExtras(extra);
    if (error) Sentry.captureException(error);
    else Sentry.captureMessage(message, "error");
  });
}

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
      return { ok: false, reason: "cancelled" };
    }
    if (v.status !== "completed") return { ok: false, reason: "not_paid" };
    if (v.amount !== payment.amount || (v.ref !== null && v.ref !== payment.id)) {
      report("Paiement : montant ou référence différents de ceux attendus", { payment_id: payment.id });
      return { ok: false, reason: "amount_mismatch" };
    }

    // Activation en une seule transaction côté base (verrou de la ligne, statut + abonnement ensemble) :
    // un seul appelant active, et aucune panne ne peut laisser un paiement « terminé » sans abonnement.
    const { data, error } = await admin.rpc("activate_payment", { p_payment: payment.id });
    if (error || !data || typeof data !== "object") {
      report("Paiement : activation impossible", { payment_id: payment.id, code: error?.code }, new Error(`activate_payment: ${error?.code ?? "no_data"}`));
      return { ok: false, reason: "error" };
    }
    const res = data as { claimed?: boolean; plan?: string | null };
    return { ok: true, plan: (res.plan ?? payment.plan) as PlanId, already: !res.claimed };
  } catch (err) {
    report("Paiement : erreur inattendue pendant la confirmation", {}, err);
    return { ok: false, reason: "error" };
  }
}
