import { cache } from "react";
import { getDashboardContext } from "@/lib/brand";
import { deadlineFor, deadlineState, monthStart, type DeadlineState } from "@/lib/kpi";
import { hasFeature, type Feature } from "@/lib/plans";
import type { TabSlug } from "@/lib/tabs";

export type ProgressStep = { slug: TabSlug; label: string; done: boolean; feature: Feature };

/** État d'avancement de la marque active : partagé par la barre latérale et la vue d'ensemble (une seule série de requêtes). */
export const getBrandProgress = cache(async () => {
  const { supabase, active, plan } = await getDashboardContext();
  const month = monthStart(new Date());
  const [identity, pillars, tone, lines, audit, kpi, brand, guides, rules, kpiEver] = await Promise.all([
    supabase.from("brand_identity").select("positioning, visual_guide").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("content_pillars").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id),
    supabase.from("tone_voice").select("do_list").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("editorial_lines").select("id, channel").eq("brand_profile_id", active.id),
    supabase.from("audits").select("report_data, created_at").eq("brand_profile_id", active.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    supabase.from("kpi_reports").select("submitted_at, deadline").eq("brand_profile_id", active.id).eq("month", month).maybeSingle(),
    supabase.from("brand_profiles").select("kpi_deadline_day").eq("id", active.id).single(),
    supabase.from("live_guides").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id),
    supabase.from("operational_rules").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id).neq("content", ""),
    supabase.from("kpi_reports").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id).not("submitted_at", "is", null),
  ]);

  const lineIds = (lines.data ?? []).map((l) => l.id);
  const entries = lineIds.length ? (await supabase.from("editorial_entries").select("status").in("editorial_line_id", lineIds)).data ?? [] : [];

  const steps: ProgressStep[] = [
    { slug: "identity", label: "Identité de marque", done: !!identity.data?.positioning, feature: "identity" },
    { slug: "charter", label: "Charte graphique", done: !!identity.data?.visual_guide, feature: "identity" },
    { slug: "pillars", label: "Piliers de contenu", done: (pillars.count ?? 0) > 0, feature: "pillars" },
    { slug: "tone", label: "Tonalité & voix", done: !!tone.data?.do_list, feature: "tone" },
    { slug: "audit", label: "Premier audit", done: !!audit.data, feature: "audit" },
    { slug: "editorial", label: "Ligne éditoriale", done: entries.length > 0, feature: "editorial" },
    { slug: "rules", label: "Règles opérationnelles", done: (rules.count ?? 0) > 0, feature: "rules" },
    { slug: "lives", label: "Guide Lives", done: (guides.count ?? 0) > 0, feature: "lives" },
    { slug: "kpi", label: "Rapport KPI du mois", done: !!kpi.data?.submitted_at, feature: "kpi" },
  ];
  const available = steps.filter((s) => hasFeature(plan, s.feature));
  const doneCount = available.filter((s) => s.done).length;
  const deadline = kpi.data?.deadline ?? deadlineFor(month, brand.data?.kpi_deadline_day ?? 5);
  const kpiState: DeadlineState = deadlineState(new Date().toISOString().slice(0, 10), deadline, kpi.data?.submitted_at ?? null);

  return {
    month,
    steps,
    available,
    percent: Math.round((doneCount / Math.max(available.length, 1)) * 100),
    next: available.find((s) => !s.done) ?? null,
    done: Object.fromEntries(steps.map((s) => [s.slug, s.done])) as Partial<Record<TabSlug, boolean>>,
    audit: audit.data,
    auditScore: (audit.data?.report_data as { score?: number } | null)?.score,
    channels: (lines.data ?? []).length,
    entries: entries.length,
    weeksDone: entries.filter((e) => e.status === "termine").length,
    guides: guides.count ?? 0,
    kpiState,
    kpiDeadline: deadline,
    kpiSubmittedAt: kpi.data?.submitted_at ?? null,
    /** Au moins un rapport KPI soumis un mois quelconque : critère du parcours guidé (le rapport du mois, lui, revient chaque mois). */
    kpiEver: (kpiEver.count ?? 0) > 0,
  };
});
