import Link from "next/link";
import EmptyState from "@/components/EmptyState";
import OrganicTab from "@/components/OrganicTab";
import PageHeader from "@/components/PageHeader";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import { organicStage } from "@/lib/plan/schemas";

export default async function OrganicPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "editorial", "organic");
  if (locked) return locked;
  const { data } = await supabase.from("brand_strategy").select("organic, organic_done").eq("brand_profile_id", active.id).maybeSingle();
  const parsed = organicStage.safeParse(data?.organic);
  if (!parsed.success) {
    return (
      <section>
        <PageHeader tab="organic" />
        <EmptyState illustration="start" title="Aucune stratégie organique pour l'instant" text="Elle est construite avec le plan stratégique : douze leviers de portée, sans budget publicitaire, chacun avec une action concrète.">
          <Link href="/dashboard/plan" className="btn-primary">Construire mon plan</Link>
        </EmptyState>
      </section>
    );
  }
  const done = Array.isArray(data?.organic_done) ? (data?.organic_done as number[]).filter((n) => Number.isInteger(n)) : [];
  return <OrganicTab key={active.id} brandId={active.id} levers={parsed.data.levers} initialDone={done} />;
}
