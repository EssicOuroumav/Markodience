import PerformanceTab, { type KpiAction, type KpiDefinition, type KpiValue } from "@/components/PerformanceTab";
import KpiTab, { type KpiReport } from "@/components/KpiTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import { footerBrand } from "@/lib/whiteLabel";
import { KpiPlanTable } from "@/components/StrategyBlocks";
import { kpiStage } from "@/lib/plan/schemas";
import { PLANS } from "@/lib/plans";
import { customIndicators, normalizeObjectives } from "@/lib/objectives";

export default async function KpiPage() {
  const { supabase, user, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "kpi");
  if (locked) return locked;
  const [{ data: reports }, { data: brand }, { data: identity }, { data: strategy }, { data: defs }, { data: vals }, { data: acts }] = await Promise.all([
    supabase.from("kpi_reports").select("id, month, data, submitted_at, deadline").eq("brand_profile_id", active.id).order("month", { ascending: false }),
    supabase.from("brand_profiles").select("kpi_deadline_day").eq("id", active.id).single(),
    supabase.from("brand_identity").select("marketing_objectives").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("brand_strategy").select("kpi_plan").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("kpi_definitions").select("id, name, unit, direction, baseline, target, period, source, frequency, alert_threshold, owner, corrective_action").eq("brand_profile_id", active.id).order("position"),
    supabase.from("kpi_values").select("id, definition_id, month, value").eq("brand_profile_id", active.id).order("month", { ascending: false }).limit(1500),
    supabase.from("kpi_actions").select("id, definition_id, title, owner, due_date, status, created_at").eq("brand_profile_id", active.id).order("created_at", { ascending: false }).limit(150),
  ]);
  const planned = kpiStage.safeParse(strategy?.kpi_plan);
  return (
    <>
    <KpiTab
      lead={<>
    <PerformanceTab key={`perf-${active.id}`} brandId={active.id} initialDefs={(defs as KpiDefinition[]) ?? []} initialValues={((vals ?? []) as KpiValue[]).map((v) => ({ ...v, value: Number(v.value) }))} initialActions={(acts as KpiAction[]) ?? []} planIndicators={planned.success ? planned.data.rows.map((r) => r.indicator) : []} />
    {planned.success && <KpiPlanTable plan={planned.data} />}
      </>}
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
    </>
  );
}
