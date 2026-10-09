import RulesTab from "@/components/RulesTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import { NumberedRules } from "@/components/StrategyBlocks";
import { rulesStage } from "@/lib/plan/schemas";

export default async function RulesPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "rules");
  if (locked) return locked;
  const [{ data }, { data: strategy }] = await Promise.all([
    supabase.from("operational_rules").select("section, content").eq("brand_profile_id", active.id),
    supabase.from("brand_strategy").select("rules").eq("brand_profile_id", active.id).maybeSingle(),
  ]);
  const planned = rulesStage.safeParse(strategy?.rules);
  const initial = Object.fromEntries((data ?? []).map((r) => [r.section as string, (r.content as string) ?? ""]));
  return (
    <>
      {planned.success && (
        <div className="mb-2">
          <NumberedRules rules={planned.data.rules} />
        </div>
      )}
      <RulesTab key={active.id} brandId={active.id} initial={initial} />
    </>
  );
}
