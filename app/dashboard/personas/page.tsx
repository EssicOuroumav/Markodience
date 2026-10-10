import PersonasTab, { type Persona } from "@/components/PersonasTab";
import { getDashboardContext } from "@/lib/brand";

export default async function PersonasPage() {
  const { supabase, active } = await getDashboardContext();
  const [{ data: personas }, { data: pillars }, { data: identity }] = await Promise.all([
    supabase.from("personas").select("id, name, profile, needs, frictions, tone, levers, channels, priority, position").eq("brand_profile_id", active.id).order("position"),
    supabase.from("content_pillars").select("id, name, persona_ids").eq("brand_profile_id", active.id),
    supabase.from("brand_identity").select("positioning").eq("brand_profile_id", active.id).maybeSingle(),
  ]);
  return <PersonasTab key={active.id} brandId={active.id} initial={(personas as Persona[]) ?? []} pillars={(pillars ?? []).map((p) => ({ id: p.id, name: p.name ?? "Sans nom", persona_ids: p.persona_ids ?? [] }))} hasIdentity={!!identity?.positioning} />;
}
