import CalendarTab from "@/components/CalendarTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import type { Post } from "@/lib/posts";

export default async function PostsPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "editorial");
  if (locked) return locked;
  const [{ data: lines }, { data: posts }, { data: pillarRows }] = await Promise.all([
    supabase.from("editorial_lines").select("id, channel, period_start").eq("brand_profile_id", active.id).order("period_start", { ascending: true }),
    supabase.from("posts").select("id, brand_profile_id, editorial_entry_id, channel, scheduled_date, caption, visual_idea, hashtags, call_to_action, status, idea, hook, pillar, format, assignee, design_link, review_note, asset_id").eq("brand_profile_id", active.id).order("scheduled_date", { ascending: true }),
    supabase.from("content_pillars").select("name").eq("brand_profile_id", active.id).order("pct", { ascending: false, nullsFirst: false }),
  ]);
  const ids = (lines ?? []).map((l) => l.id);
  const { data: entries } = ids.length
    ? await supabase.from("editorial_entries").select("id, editorial_line_id, week_number, theme").in("editorial_line_id", ids).order("week_number", { ascending: true })
    : { data: [] };
  const weeks = (entries ?? []).map((e) => {
    const line = (lines ?? []).find((l) => l.id === e.editorial_line_id);
    return { id: e.id, channel: line?.channel ?? "", week: e.week_number ?? 1, theme: e.theme ?? "" };
  });
  const channels = [...new Set([...(lines ?? []).map((l) => l.channel ?? ""), ...((posts ?? []).map((p) => p.channel ?? ""))].filter(Boolean))];
  return <CalendarTab key={active.id} brandId={active.id} weeks={weeks} initialPosts={(posts as Post[]) ?? []} channels={channels} pillars={(pillarRows ?? []).map((p) => p.name ?? "").filter(Boolean)} />;
}
