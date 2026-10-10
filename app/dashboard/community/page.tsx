import CommunityTab, { type CommunityItem, type Interaction } from "@/components/CommunityTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";

export default async function CommunityPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "rules");
  if (locked) return locked;
  const [{ data: items }, { data: ints }, { data: identity }] = await Promise.all([
    supabase.from("community_items").select("id, kind, title, situation, body, level, owner, source, position").eq("brand_profile_id", active.id).order("position"),
    supabase.from("interactions").select("id, person, network, temperature, note, next_step, due_date, status, created_at").eq("brand_profile_id", active.id).order("created_at", { ascending: false }).limit(300),
    supabase.from("brand_identity").select("positioning").eq("brand_profile_id", active.id).maybeSingle(),
  ]);
  return <CommunityTab key={active.id} brandId={active.id} initialItems={(items as CommunityItem[]) ?? []} initialInteractions={(ints as Interaction[]) ?? []} hasIdentity={!!identity?.positioning} />;
}
