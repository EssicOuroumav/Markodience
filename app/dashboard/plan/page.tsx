import PlanBuilder from "@/components/PlanBuilder";
import type { ReviewData } from "@/components/PlanReview";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import type { Brief } from "@/lib/plan/brief";
import { completedStages, type StoredDraft } from "@/lib/plan/store";

export default async function PlanPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "editorial", "plan");
  if (locked) return locked;
  const [{ data: strategy }, { count: pillars }, { count: lines }] = await Promise.all([
    supabase.from("brand_strategy").select("brief, draft, critique, checks, built_at").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("content_pillars").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id),
    supabase.from("editorial_lines").select("id", { count: "exact", head: true }).eq("brand_profile_id", active.id),
  ]);
  const draft = (strategy?.draft as StoredDraft | null) ?? null;
  const built = !!strategy?.built_at;
  const review: ReviewData | null = built ? { critique: strategy?.critique ?? null, checks: strategy?.checks ?? null, built_at: strategy?.built_at ?? null } : null;
  const done = built ? [] : completedStages(draft);
  return (
    <PlanBuilder
      key={active.id}
      brandId={active.id}
      brandName={active.name}
      sector={active.sector ?? ""}
      brandStatus={active.status ?? ""}
      hasContent={(pillars ?? 0) > 0 || (lines ?? 0) > 0}
      savedBrief={built ? null : ((strategy?.brief as Brief | null) ?? null)}
      draftSteps={done.filter((k) => k !== "start")}
      inProgress={!built && !!draft}
      review={review}
    />
  );
}
