import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/payments/admin";
import { appUrl, getProvider } from "@/lib/payments";
import { PLANS, normalizeSeats, priceFor } from "@/lib/plans";
import { rateLimit, tooMany } from "@/lib/rateLimit";

const body = z.object({ plan: z.enum(["pro", "agence"]), seats: z.number().int().optional() });

const fail = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail(401, "Connexion requise.");
  if (!(await rateLimit(`checkout:${user.id}`, 10, 600))) return tooMany();

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(400, "Requête invalide.");
  const { plan } = parsed.data;
  const seats = normalizeSeats(plan, parsed.data.seats ?? (plan === "pro" ? 1 : undefined));
  if (seats === null) return fail(400, plan === "agence" ? "Le palier Agence demande au moins 2 sièges." : "Nombre de sièges invalide.");

  const resolved = getProvider();
  if ("error" in resolved) return fail(503, "Le paiement n'est pas encore disponible. Réessayez bientôt.");

  // Le montant est recalculé ici : jamais fourni par le navigateur.
  const amount = priceFor(plan, seats);
  const admin = createAdminClient();
  // Une seule facture en attente par utilisateur (index unique en base) : on abandonne les anciennes
  // factures en attente (plus de 10 s) et un double clic simultané reçoit un message clair.
  // Une ancienne facture payée malgré tout reste activable : le paiement est vérifié chez le prestataire.
  await admin.from("payments").update({ status: "cancelled" }).eq("user_id", user.id).eq("status", "pending").lt("created_at", new Date(Date.now() - 10_000).toISOString());
  const { data: payment, error } = await admin
    .from("payments")
    .insert({ user_id: user.id, plan, seats, amount, provider: resolved.provider.name })
    .select("id")
    .single();
  if (error?.code === "23505") return fail(409, "Un paiement est déjà en cours d'initialisation. Patientez quelques secondes puis réessayez.");
  if (error || !payment) return fail(500, "Le paiement n'a pas pu être initialisé.");

  const base = appUrl(request);
  try {
    const invoice = await resolved.provider.createInvoice({
      amount,
      description: `Markodience ${PLANS[plan].label}${plan === "agence" ? ` (${seats} sièges)` : ""} - 1 mois`,
      ref: payment.id,
      returnUrl: `${base}/payment/return?ref=${payment.id}`,
      cancelUrl: `${base}/dashboard/upgrade?status=cancelled`,
      callbackUrl: `${base}/api/payments/webhook`,
      customer: { email: user.email ?? undefined },
    });
    await admin.from("payments").update({ provider_token: invoice.token }).eq("id", payment.id);
    return NextResponse.json({ ok: true, url: invoice.checkoutUrl });
  } catch {
    await admin.from("payments").update({ status: "failed" }).eq("id", payment.id);
    return fail(502, "Le service de paiement ne répond pas. Réessayez dans un instant.");
  }
}
