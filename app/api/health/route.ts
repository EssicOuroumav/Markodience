import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/payments/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Point de contrôle pour un moniteur de disponibilité (UptimeRobot…). Ne révèle que « ok » ou « panne » : aucun détail, aucune donnée. */
export async function GET() {
  try {
    const { error } = await createAdminClient().from("subscriptions").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
