import PillarsTab, { type Pillar } from "@/components/PillarsTab";
import { getDashboardContext } from "@/lib/brand";
import { normalizeObjectives } from "@/lib/objectives";
import { methodSteps, strategyChain } from "@/lib/strategy/evaluate";
import type { Diagnostic } from "@/lib/strategy/schemas";

const COLUMNS = "id, name, description, examples, pct, role, objective, persona_ids, subthemes, cta, kpi, rationale, status";

export default async function PillarsPage() {
  const { supabase, active } = await getDashboardContext();
  const [{ data: pillars }, { data: identity }, { data: personas }, { data: ideas }, { data: posts }] = await Promise.all([
    supabase.from("content_pillars").select(COLUMNS).eq("brand_profile_id", active.id).order("pct", { ascending: false, nullsFirst: false }),
    supabase.from("brand_identity").select("positioning, marketing_objectives, diagnostic").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("personas").select("id, name").eq("brand_profile_id", active.id).order("position"),
    supabase.from("content_ideas").select("pillar_id, status").eq("brand_profile_id", active.id),
    supabase.from("posts").select("pillar, status").eq("brand_profile_id", active.id),
  ]);
  const list = (pillars ?? []) as Pillar[];
  const objectives = normalizeObjectives(identity?.marketing_objectives).map((o) => o.text);
  const diagnostic = (identity?.diagnostic as Diagnostic | null) ?? null;
  const allPosts = posts ?? [];
  const steps = methodSteps({
    hasIdentity: !!identity?.positioning, objectives: objectives.length, personas: (personas ?? []).length, diagnostic, pillars: list,
    published: allPosts.filter((p) => p.status === "publie").length, planned: allPosts.filter((p) => p.status !== "publie").length,
  });
  const chain = strategyChain(objectives, list, ideas ?? [], allPosts);
  const ideaCounts = Object.fromEntries(list.map((p) => [p.id, { total: (ideas ?? []).filter((i) => i.pillar_id === p.id).length, kept: (ideas ?? []).filter((i) => i.pillar_id === p.id && (i.status === "retenue" || i.status === "produite")).length }]));
  return <PillarsTab key={active.id} brandId={active.id} initial={list} hasIdentity={!!identity?.positioning} objectives={objectives} personas={personas ?? []} diagnostic={diagnostic} steps={steps} chain={chain} ideaCounts={ideaCounts} />;
}
