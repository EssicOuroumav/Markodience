import LivesTab, { type Guide, type Member, type Script } from "@/components/LivesTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";

export default async function LivesPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "lives");
  if (locked) return locked;
  const [{ data: brand }, { data: guides }, { data: members }] = await Promise.all([
    supabase.from("brand_profiles").select("lives_enabled").eq("id", active.id).single(),
    supabase.from("live_guides").select("id, objective, structure_data").eq("brand_profile_id", active.id).order("created_at", { ascending: true }),
    supabase.from("live_team_members").select("id, name, role, channel, rotation_week").eq("brand_profile_id", active.id),
  ]);
  const ids = (guides ?? []).map((g) => g.id);
  const { data: scripts } = ids.length
    ? await supabase.from("live_scripts").select("id, live_guide_id, situation, content, is_quick_reply").in("live_guide_id", ids)
    : { data: [] };
  return (
    <LivesTab
      key={active.id}
      brandId={active.id}
      enabled={!!brand?.lives_enabled}
      initialGuides={(guides as Guide[]) ?? []}
      initialMembers={(members as Member[]) ?? []}
      initialScripts={(scripts as Script[]) ?? []}
    />
  );
}
