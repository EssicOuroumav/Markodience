import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { confirmPayment } from "@/lib/payments/confirm";
import { createAdminClient } from "@/lib/payments/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PER_RUN = 50;
const MIN_AGE_MIN = 30; // laisse au webhook et à la page de retour le temps de faire leur travail
const MAX_AGE_DAYS = 30;

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Rattrapage quotidien : un paiement resté « en attente » (notification manquée, client parti avant le retour) est revérifié
 * auprès du prestataire, qui reste la seule source de vérité. Protégé par CRON_SECRET. La réponse ne contient que des totaux.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET non configuré." }, { status: 503 });
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(given, secret)) return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });

  const admin = createAdminClient();
  const now = Date.now();
  const { data, error } = await admin
    .from("payments")
    .select("id")
    .eq("status", "pending")
    .lte("created_at", new Date(now - MIN_AGE_MIN * 60_000).toISOString())
    .gte("created_at", new Date(now - MAX_AGE_DAYS * 86_400_000).toISOString())
    .order("created_at", { ascending: true })
    .limit(MAX_PER_RUN);
  if (error) {
    Sentry.captureException(new Error(`cron payments: ${error.code}`));
    return NextResponse.json({ ok: false, error: "Lecture impossible." }, { status: 500 });
  }

  const totals = { checked: 0, activated: 0, still_pending: 0, cancelled: 0, problems: 0 };
  for (const p of data ?? []) {
    totals.checked++;
    const r = await confirmPayment({ ref: p.id });
    if (r.ok) totals.activated += r.already ? 0 : 1;
    else if (r.reason === "not_paid") totals.still_pending++;
    else if (r.reason === "cancelled") totals.cancelled++;
    else totals.problems++;
  }
  // Un paiement qui reste en attente au-delà de 30 jours n'est plus revérifié : on le signale pour contrôle manuel.
  const { count: stale } = await admin.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", new Date(now - MAX_AGE_DAYS * 86_400_000).toISOString());
  if (totals.problems > 0 || (stale ?? 0) > 0) Sentry.captureMessage(`Paiements : ${totals.problems} problème(s), ${stale ?? 0} en attente depuis plus de ${MAX_AGE_DAYS} jours`, "warning");
  const purged = await admin.rpc("purge_rate_limits");
  return NextResponse.json({ ok: true, ...totals, stale: stale ?? 0, purged_rate_limits: typeof purged.data === "number" ? purged.data : 0 });
}
