import KpiTab, { type KpiReport } from "@/components/KpiTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import { PLANS } from "@/lib/plans";

export default async function KpiPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "kpi");
  if (locked) return locked;
  const [{ data: reports }, { data: brand }] = await Promise.all([
    supabase.from("kpi_reports").select("id, month, data, submitted_at, deadline").eq("brand_profile_id", active.id).order("month", { ascending: false }),
    supabase.from("brand_profiles").select("kpi_deadline_day").eq("id", active.id).single(),
  ]);
  return (
    <KpiTab
      key={active.id}
      brandId={active.id}
      brandName={active.name}
      brandColor={active.primary_color}
      deadlineDay={brand?.kpi_deadline_day ?? 5}
      initial={(reports as KpiReport[]) ?? []}
      watermark={PLANS[plan].exportWatermark}
    />
  );
}
