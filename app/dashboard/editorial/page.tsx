import EditorialTab, { type Entry, type Line } from "@/components/EditorialTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import { networkStage } from "@/lib/plan/schemas";
import type { LineRow } from "@/components/editorial/LineView";

export default async function EditorialPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "editorial");
  if (locked) return locked;
  const [{ data: lines }, { count: pillarCount }] = await Promise.all([
    supabase.from("editorial_lines").select("id, channel, period_start, period_end").eq("brand_profile_id", active.id).order("period_start", { ascending: true }),
    supabase.from("content_pillars").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id),
  ]);
  const [{ data: postRows }, { data: pillarRows }] = await Promise.all([
    supabase.from("posts").select("id, editorial_entry_id, scheduled_date, idea, hook, pillar, format, caption, status").eq("brand_profile_id", active.id).not("editorial_entry_id", "is", null).limit(2000),
    supabase.from("content_pillars").select("name, role").eq("brand_profile_id", active.id),
  ]);
  const { data: strategy } = await supabase.from("brand_strategy").select("networks").eq("brand_profile_id", active.id).maybeSingle();
  const profiles = Object.fromEntries(Object.entries((strategy?.networks ?? {}) as Record<string, { profile?: unknown }>).flatMap(([k, v]) => { const p = networkStage.safeParse(v?.profile); return p.success ? [[k, p.data]] : []; }));
  const ids = (lines ?? []).map((l) => l.id);
  const { data: entries } = ids.length
    ? await supabase
        .from("editorial_entries")
        .select("id, editorial_line_id, week_number, position, theme, content_type, format, frequency, suggested_time, status, validation_status, validated_by, validated_at, validation_requested_by, validation_requested_at, phase, campaign")
        .in("editorial_line_id", ids)
    : { data: [] };
  return (
    <EditorialTab
      key={active.id}
      brandId={active.id}
      initialLines={(lines as Line[]) ?? []}
      initialEntries={(entries as Entry[]) ?? []}
      hasPillars={(pillarCount ?? 0) > 0}
      profiles={profiles}
      initialRows={(postRows as LineRow[]) ?? []}
      pillarRoles={Object.fromEntries((pillarRows ?? []).map((p) => [p.name ?? "", p.role ?? ""]))}
    />
  );
}
