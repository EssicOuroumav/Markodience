import AuditTab, { type AuditRow } from "@/components/AuditTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";

export default async function AuditPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "audit");
  if (locked) return locked;
  const { data } = await supabase
    .from("audits")
    .select("id, created_at, report_data")
    .eq("brand_profile_id", active.id)
    .order("created_at", { ascending: false });
  return <AuditTab key={active.id} brandId={active.id} initial={(data as AuditRow[]) ?? []} />;
}
