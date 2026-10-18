import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/payments/confirm";
import { ipOf, rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

/**
 * IPN du prestataire. Le corps n'est jamais cru : on n'en extrait que le jeton de facture,
 * puis confirmPayment() vérifie auprès du prestataire (statut + montant) avant d'activer quoi que ce soit.
 */
export async function POST(request: Request) {
  // Plafond large : le prestataire envoie peu de notifications ; il protège la base contre une inondation, sans gêner les nouvelles tentatives légitimes.
  if (!(await rateLimit(`webhook:${ipOf(request.headers)}`, 300, 600))) return new Response("RATE", { status: 429 });
  const raw = await request.text();
  let token: string | undefined;
  const ct = request.headers.get("content-type") ?? "";
  if (ct.includes("application/json")) {
    try {
      const j = JSON.parse(raw);
      token = j?.data?.invoice?.token ?? j?.invoice?.token ?? j?.token;
    } catch {
      /* corps illisible */
    }
  } else {
    const form = new URLSearchParams(raw);
    token = form.get("data[invoice][token]") ?? form.get("data[token]") ?? form.get("token") ?? undefined;
  }
  if (!token || typeof token !== "string" || token.length > 200) return NextResponse.json({ ok: false }, { status: 400 });

  const out = await confirmPayment({ token });
  // 5xx uniquement pour les erreurs transitoires : le prestataire réessaiera.
  if (!out.ok && (out.reason === "error" || out.reason === "not_configured")) return new Response("ERROR", { status: 500 });
  // PayDunya exige que l'URL de notification réponde exactement « ROK » (sinon le passage en production est refusé).
  return new Response("ROK", { status: 200, headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
