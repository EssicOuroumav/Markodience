import IdeasTab, { type Idea } from "@/components/IdeasTab";
import { getDashboardContext } from "@/lib/brand";

const COLUMNS = "id, pillar_id, persona_id, title, notes, source, url, competitor, subtheme, format, networks, status, created_at";

export default async function IdeasPage({ searchParams }: { searchParams: Promise<{ pillar?: string }> }) {
  const { pillar } = await searchParams;
  const { supabase, active } = await getDashboardContext();
  const [{ data: ideas }, { data: pillars }] = await Promise.all([
    supabase.from("content_ideas").select(COLUMNS).eq("brand_profile_id", active.id).order("created_at", { ascending: false }).limit(500),
    supabase.from("content_pillars").select("id, name").eq("brand_profile_id", active.id).order("pct", { ascending: false, nullsFirst: false }),
  ]);
  const pillarList = (pillars ?? []).map((p) => ({ id: p.id, name: p.name ?? "Sans nom" }));
  return <IdeasTab key={active.id} brandId={active.id} initial={(ideas as Idea[]) ?? []} pillars={pillarList} initialPillar={pillarList.some((p) => p.id === pillar) ? pillar! : ""} />;
}
