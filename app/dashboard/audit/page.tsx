import AuditTab, { type AuditRow } from "@/components/AuditTab";
import { getDashboardContext } from "@/lib/brand";

export default async function AuditPage() {
  const { supabase, active } = await getDashboardContext();
  const { data } = await supabase
    .from("audits")
    .select("id, created_at, report_data")
    .eq("brand_profile_id", active.id)
    .order("created_at", { ascending: false });
  return <AuditTab key={active.id} brandId={active.id} initial={(data as AuditRow[]) ?? []} />;
}
