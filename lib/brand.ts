import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isPlanId, type PlanId } from "@/lib/plans";
import type { BrandProfile } from "@/types";

export const ACTIVE_BRAND_COOKIE = "active_brand";

/** Utilisateur connecté + profils + profil actif (cookie, sinon le premier). */
export async function getDashboardContext() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles } = await supabase
    .from("brand_profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<BrandProfile[]>();
  if (!profiles || profiles.length === 0) redirect("/signup");

  const { data: sub } = await supabase.rpc("my_subscription").maybeSingle<{ plan: string; seats: number; current_period_end: string | null }>();
  const plan: PlanId = isPlanId(sub?.plan) ? sub.plan : "gratuit";

  const wanted = cookies().get(ACTIVE_BRAND_COOKIE)?.value;
  const active = profiles.find((p) => p.id === wanted) ?? profiles[0];
  return { supabase, user, profiles, active, plan, seats: sub?.seats ?? 1, periodEnd: sub?.current_period_end ?? null };
}
