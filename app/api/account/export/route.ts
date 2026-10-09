import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Export de toutes les données de l'utilisateur connecté (droit d'accès et de portabilité).
 * Les requêtes passent par la session de l'utilisateur : la sécurité au niveau des lignes (RLS) garantit
 * qu'il ne reçoit que ses propres données.
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Connexion requise." }, { status: 401 });

  const { data: brands } = await supabase.from("brand_profiles").select("*").order("created_at");
  const ids = (brands ?? []).map((b) => b.id);
  const byBrand = async (table: string) => (ids.length ? (await supabase.from(table).select("*").in("brand_profile_id", ids)).data ?? [] : []);

  const [identity, pillars, tone, lines, audits, kpi, rules, guides, team, posts, assets] = await Promise.all([
    byBrand("brand_identity"), byBrand("content_pillars"), byBrand("tone_voice"), byBrand("editorial_lines"),
    byBrand("audits"), byBrand("kpi_reports"), byBrand("operational_rules"), byBrand("live_guides"), byBrand("live_team_members"), byBrand("posts"), byBrand("assets"),
  ]);
  const lineIds = lines.map((l: { id: string }) => l.id);
  const guideIds = guides.map((g: { id: string }) => g.id);
  const [entries, scripts, payments, subscription] = await Promise.all([
    lineIds.length ? supabase.from("editorial_entries").select("*").in("editorial_line_id", lineIds).then((r) => r.data ?? []) : [],
    guideIds.length ? supabase.from("live_scripts").select("*").in("live_guide_id", guideIds).then((r) => r.data ?? []) : [],
    supabase.from("payments").select("id, plan, seats, amount, provider, status, created_at, confirmed_at").then((r) => r.data ?? []),
    supabase.from("subscriptions").select("plan, seats, status, current_period_start, current_period_end, payment_provider").maybeSingle().then((r) => r.data),
  ]);

  const body = {
    exported_at: new Date().toISOString(),
    account: { id: user.id, email: user.email, created_at: user.created_at, full_name: user.user_metadata?.full_name ?? null, phone: user.user_metadata?.phone ?? null, terms_accepted_at: user.user_metadata?.terms_accepted_at ?? null, terms_version: user.user_metadata?.terms_version ?? null },
    subscription, payments, brands,
    brand_identity: identity, content_pillars: pillars, tone_voice: tone,
    editorial_lines: lines, editorial_entries: entries, audits, kpi_reports: kpi, operational_rules: rules,
    live_guides: guides, live_scripts: scripts, live_team_members: team, posts, library_files: assets,
  };
  const day = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(body, null, 2), {
    headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="markodience-donnees-${day}.json"`, "Cache-Control": "no-store" },
  });
}
