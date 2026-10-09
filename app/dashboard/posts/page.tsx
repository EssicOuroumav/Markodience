import PostsTab from "@/components/PostsTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import type { Post } from "@/lib/posts";

export default async function PostsPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "editorial");
  if (locked) return locked;
  const [{ data: lines }, { data: posts }] = await Promise.all([
    supabase.from("editorial_lines").select("id, channel, period_start").eq("brand_profile_id", active.id).order("period_start", { ascending: true }),
    supabase.from("posts").select("id, brand_profile_id, editorial_entry_id, channel, scheduled_date, caption, visual_idea, hashtags, call_to_action, status, idea, hook, pillar, format").eq("brand_profile_id", active.id).order("scheduled_date", { ascending: true }),
  ]);
  const ids = (lines ?? []).map((l) => l.id);
  const { data: entries } = ids.length
    ? await supabase.from("editorial_entries").select("id, editorial_line_id, week_number, theme").in("editorial_line_id", ids).order("week_number", { ascending: true })
    : { data: [] };
  const weeks = (entries ?? []).map((e) => {
    const line = (lines ?? []).find((l) => l.id === e.editorial_line_id);
    return { id: e.id, channel: line?.channel ?? "", week: e.week_number ?? 1, theme: e.theme ?? "" };
  });
  return <PostsTab key={active.id} brandId={active.id} weeks={weeks} initialPosts={(posts as Post[]) ?? []} channels={(lines ?? []).map((l) => l.channel ?? "")} />;
}
