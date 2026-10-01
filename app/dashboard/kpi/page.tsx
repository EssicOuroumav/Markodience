import KpiTab, { type KpiReport } from "@/components/KpiTab";
import { getDashboardContext } from "@/lib/brand";

export default async function KpiPage() {
  const { supabase, active } = await getDashboardContext();
  const [{ data: reports }, { data: brand }] = await Promise.all([
    supabase.from("kpi_reports").select("id, month, data, submitted_at, deadline").eq("brand_profile_id", active.id).order("month", { ascending: false }),
    supabase.from("brand_profiles").select("kpi_deadline_day").eq("id", active.id).single(),
  ]);
  return (
    <KpiTab
      key={active.id}
      brandId={active.id}
      brandName={active.name}
      deadlineDay={brand?.kpi_deadline_day ?? 5}
      initial={(reports as KpiReport[]) ?? []}
      watermark={false /* étape 9 : dérivé du plan actif (exportWatermark) */}
    />
  );
}
