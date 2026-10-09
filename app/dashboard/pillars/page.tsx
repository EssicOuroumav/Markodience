import PillarsTab, { type Pillar } from "@/components/PillarsTab";
import { getDashboardContext } from "@/lib/brand";

export default async function PillarsPage() {
  const { supabase, active } = await getDashboardContext();
  const [{ data: pillars }, { data: identity }] = await Promise.all([
    supabase.from("content_pillars").select("id, name, description, examples, pct").eq("brand_profile_id", active.id),
    supabase.from("brand_identity").select("positioning").eq("brand_profile_id", active.id).maybeSingle(),
  ]);
  return <PillarsTab key={active.id} brandId={active.id} initial={(pillars as Pillar[]) ?? []} hasIdentity={!!identity?.positioning} />;
}
