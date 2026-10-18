import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/payments/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Point de contrôle pour un moniteur de disponibilité (UptimeRobot…). Ne révèle que « ok » ou « panne » : aucun détail, aucune donnée. */
export async function GET() {
  try {
    const { error } = await createAdminClient().from("subscriptions").select("id", { head: true, count: "exact" }).limit(1);
    if (error) throw error;
    // Mise en cache 15 s par le réseau de Vercel : une inondation de cette adresse ne touche plus la base. Une panne n'est jamais mise en cache.
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "public, s-maxage=15" } });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
