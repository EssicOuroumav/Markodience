import EditorialTab, { type Entry, type Line } from "@/components/EditorialTab";
import { getDashboardContext } from "@/lib/brand";

export default async function EditorialPage() {
  const { supabase, active } = await getDashboardContext();
  const [{ data: lines }, { count: pillarCount }] = await Promise.all([
    supabase.from("editorial_lines").select("id, channel, period_start, period_end").eq("brand_profile_id", active.id).order("period_start", { ascending: true }),
    supabase.from("content_pillars").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id),
  ]);
  const ids = (lines ?? []).map((l) => l.id);
  const { data: entries } = ids.length
    ? await supabase
        .from("editorial_entries")
        .select("id, editorial_line_id, week_number, position, theme, content_type, format, frequency, suggested_time, status, validation_status, validated_by, validated_at, validation_requested_by, validation_requested_at")
        .in("editorial_line_id", ids)
    : { data: [] };
  return (
    <EditorialTab
      key={active.id}
      brandId={active.id}
      initialLines={(lines as Line[]) ?? []}
      initialEntries={(entries as Entry[]) ?? []}
      hasPillars={(pillarCount ?? 0) > 0}
    />
  );
}
