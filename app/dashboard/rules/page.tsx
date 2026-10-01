import RulesTab from "@/components/RulesTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";

export default async function RulesPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "rules");
  if (locked) return locked;
  const { data } = await supabase.from("operational_rules").select("section, content").eq("brand_profile_id", active.id);
  const initial = Object.fromEntries((data ?? []).map((r) => [r.section as string, (r.content as string) ?? ""]));
  return <RulesTab key={active.id} brandId={active.id} initial={initial} />;
}
