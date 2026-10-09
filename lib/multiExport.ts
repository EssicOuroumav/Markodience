import type { SupabaseClient } from "@supabase/supabase-js";
import { EMPTY_KPI, kpiData, monthLabel, type KpiData } from "./kpi";
import { customIndicators, normalizeObjectives } from "./objectives";

const clean = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "Marque";

/** Un nom de dossier par marque, sans accents ni caractères interdits, jamais deux fois le même. */
export function uniqueFolderNames(names: string[]): string[] {
  const seen = new Map<string, number>();
  return names.map((n) => {
    const base = clean(n).slice(0, 40);
    const count = (seen.get(base.toLowerCase()) ?? 0) + 1;
    seen.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base}-${count}`;
  });
}

export type SummaryRow = { brand: string; month: string; submitted: boolean; data: KpiData | null };

/** Synthèse des marques pour un mois : CSV lisible par Excel en français (séparateur « ; », accents conservés). */
export function summaryCsv(rows: SummaryRow[]): string {
  const cell = (v: string | number) => {
    const s = String(v);
    // Un texte qui commencerait par = + - @ serait interprété comme une formule par un tableur.
    const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
    return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = ["Marque", "Mois", "Rapport rendu", "Portée", "Engagement", "Nouveaux abonnés", "Publications réalisées", "Publications prévues"];
  const lines = rows.map((r) => [r.brand, monthLabel(r.month), r.submitted ? "oui" : "non", r.data?.reach ?? "", r.data?.engagement ?? "", r.data?.new_followers ?? "", r.data?.posts_done ?? "", r.data?.posts_planned ?? ""].map(cell).join(";"));
  return "﻿" + [head.map(cell).join(";"), ...lines].join("\r\n") + "\r\n";
}

type Brand = { id: string; name: string; primary_color: string | null };

/**
 * Archive des clients d'une agence : pour chaque marque, son guide de marque et son rapport KPI du mois choisi (s'il existe),
 * plus une synthèse chiffrée. Tout est construit dans le navigateur à partir des données de l'utilisateur (RLS).
 */
export async function buildClientsZip(supabase: SupabaseClient, brands: Brand[], month: string, footer: string): Promise<Blob> {
  const [{ default: JSZip }, { buildBrandGuidePdf, brandGuideFileName }, { buildKpiPdf, kpiFileName }] = await Promise.all([import("jszip"), import("./brandGuidePdf"), import("./kpiPdf")]);
  const zip = new JSZip();
  const folders = uniqueFolderNames(brands.map((b) => b.name));
  const rows: SummaryRow[] = [];

  for (const [i, b] of brands.entries()) {
    const dir = zip.folder(folders[i]);
    if (!dir) continue;
    const [{ data: id }, { data: pillars }, { data: tone }, { data: report }] = await Promise.all([
      supabase.from("brand_identity").select("positioning, target_segments, visual_palette, marketing_objectives, foundations, visual_guide").eq("brand_profile_id", b.id).maybeSingle(),
      supabase.from("content_pillars").select("name, description, examples").eq("brand_profile_id", b.id),
      supabase.from("tone_voice").select("do_list, dont_list").eq("brand_profile_id", b.id).maybeSingle(),
      supabase.from("kpi_reports").select("data, submitted_at").eq("brand_profile_id", b.id).eq("month", month).maybeSingle(),
    ]);
    if (id?.positioning) dir.file(brandGuideFileName(b.name), buildBrandGuidePdf({ brandName: b.name, color: b.primary_color, identity: id, pillars: pillars ?? [], tone, footer }).output("arraybuffer"));
    const parsed = report ? kpiData.safeParse(report.data) : null;
    const data = parsed?.success ? parsed.data : report ? EMPTY_KPI : null;
    if (report && data) {
      dir.file(kpiFileName(b.name, month), buildKpiPdf({ brandName: b.name, month, data, color: b.primary_color, customIndicators: customIndicators(normalizeObjectives(id?.marketing_objectives)), footer }).output("arraybuffer"));
    }
    rows.push({ brand: b.name, month, submitted: !!report?.submitted_at, data });
  }
  zip.file(`Synthese_${month.slice(0, 7)}.csv`, summaryCsv(rows));
  return zip.generateAsync({ type: "blob" });
}
