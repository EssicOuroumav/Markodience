import { NextResponse } from "next/server";
import { mockPay } from "@/lib/payments/mock";

export async function GET(request: Request) {
  if (process.env.PAYMENTS_MOCK !== "1" || process.env.NODE_ENV === "production") return new NextResponse("Not found", { status: 404 });
  const url = new URL(request.url);
  const entry = mockPay(url.searchParams.get("token") ?? "", url.searchParams.get("ok") === "1");
  if (!entry) return NextResponse.redirect(new URL("/dashboard/upgrade?status=error", url.origin));
  return NextResponse.redirect(new URL(`/payment/return?ref=${entry.ref}`, url.origin));
}
