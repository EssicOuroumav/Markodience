import IdentityTab, { type Identity } from "@/components/IdentityTab";
import { getDashboardContext } from "@/lib/brand";

export default async function IdentityPage() {
  const { supabase, active } = await getDashboardContext();
  const { data } = await supabase
    .from("brand_identity")
    .select("positioning, target_segments, visual_palette, marketing_objectives, questionnaire")
    .eq("brand_profile_id", active.id)
    .maybeSingle();
  // Rapports KPI : avancement des objectifs mesurés (aucun pour un palier sans suivi KPI).
  const { data: kpi } = await supabase.from("kpi_reports").select("month, data").eq("brand_profile_id", active.id).order("month", { ascending: false }).limit(36);
  return (
    <IdentityTab
      key={active.id}
      brandId={active.id}
      brandName={active.name}
      sector={active.sector ?? ""}
      initial={(data as Identity | null) ?? null}
      kpiReports={kpi ?? []}
    />
  );
}
