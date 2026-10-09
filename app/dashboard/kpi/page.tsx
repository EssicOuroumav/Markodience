import KpiTab, { type KpiReport } from "@/components/KpiTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import { footerBrand } from "@/lib/whiteLabel";
import { PLANS } from "@/lib/plans";
import { customIndicators, normalizeObjectives } from "@/lib/objectives";

export default async function KpiPage() {
  const { supabase, user, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "kpi");
  if (locked) return locked;
  const [{ data: reports }, { data: brand }, { data: identity }] = await Promise.all([
    supabase.from("kpi_reports").select("id, month, data, submitted_at, deadline").eq("brand_profile_id", active.id).order("month", { ascending: false }),
    supabase.from("brand_profiles").select("kpi_deadline_day").eq("id", active.id).single(),
    supabase.from("brand_identity").select("marketing_objectives").eq("brand_profile_id", active.id).maybeSingle(),
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
      footer={footerBrand(plan, user.user_metadata)}
      customIndicators={customIndicators(normalizeObjectives(identity?.marketing_objectives))}
    />
  );
}
