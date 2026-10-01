import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/payments/confirm";

export const runtime = "nodejs";

/**
 * IPN du prestataire. Le corps n'est jamais cru : on n'en extrait que le jeton de facture,
 * puis confirmPayment() vérifie auprès du prestataire (statut + montant) avant d'activer quoi que ce soit.
 */
export async function POST(request: Request) {
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
  if (!out.ok && (out.reason === "error" || out.reason === "not_configured")) return NextResponse.json({ ok: false }, { status: 500 });
  return NextResponse.json({ ok: out.ok });
}
