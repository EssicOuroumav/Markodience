import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/payments/confirm";

/** Retour du client après paiement : même confirmation que le webhook (idempotente). */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const ref = url.searchParams.get("ref") ?? "";
  const to = (path: string) => NextResponse.redirect(new URL(path, url.origin));
  if (!/^[0-9a-f-]{36}$/i.test(ref)) return to("/dashboard/upgrade?status=error");

  const out = await confirmPayment({ ref });
  if (out.ok) return to(`/dashboard/identity?upgraded=${out.plan}`);
  const status = out.reason === "not_paid" ? "pending" : out.reason === "cancelled" ? "cancelled" : "error";
  return to(`/dashboard/upgrade?status=${status}`);
}
