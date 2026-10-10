import { cache } from "react";
import { getDashboardContext } from "@/lib/brand";
import { readBrandInfo } from "@/lib/brandInfo";

export type UpcomingPost = { id: string; channel: string | null; scheduled_date: string | null; status: string; text: string };

/** Chiffres de la vue d'ensemble : un coup d'œil sur chaque module de la marque active. */
export const getOverview = cache(async () => {
  const { supabase, active } = await getDashboardContext();
  const id = active.id;
  const today = new Date().toISOString().slice(0, 10);
  const count = (table: string, filter?: (q: ReturnType<typeof supabase.from>) => unknown) => {
    const q = supabase.from(table).select("id", { count: "exact", head: true }).eq("brand_profile_id", id);
    return (filter ? (filter(q as never) as typeof q) : q).then((r) => r.count ?? 0);
  };
  const [identity, pillars, strategy, upcoming, draft, ready, published, assets, rules, guides, personas, ideas] = await Promise.all([
    supabase.from("brand_identity").select("positioning, foundations").eq("brand_profile_id", id).maybeSingle(),
    supabase.from("content_pillars").select("name, pct").eq("brand_profile_id", id).order("pct", { ascending: false, nullsFirst: false }),
    supabase.from("brand_strategy").select("organic, organic_done, built_at").eq("brand_profile_id", id).maybeSingle(),
    supabase.from("posts").select("id, channel, scheduled_date, status, idea, caption").eq("brand_profile_id", id).neq("status", "publie").gte("scheduled_date", today).order("scheduled_date", { ascending: true }).limit(5),
    count("posts", (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq("status", "brouillon")),
    count("posts", (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq("status", "programme")),
    count("posts", (q) => (q as never as { eq: (a: string, b: string) => unknown }).eq("status", "publie")),
    count("assets"),
    count("operational_rules", (q) => (q as never as { neq: (a: string, b: string) => unknown }).neq("content", "")),
    count("live_guides"),
    supabase.from("personas").select("name, priority").eq("brand_profile_id", id).order("position"),
    supabase.from("content_ideas").select("status").eq("brand_profile_id", id),
  ]);
  const organic = (strategy.data?.organic as { levers?: unknown[] } | null)?.levers?.length ?? 0;
  const organicDone = Array.isArray(strategy.data?.organic_done) ? (strategy.data?.organic_done as unknown[]).length : 0;
  const mission = (identity.data?.foundations as { mission?: string } | null)?.mission ?? identity.data?.positioning ?? null;
  return {
    info: readBrandInfo(active),
    mission,
    hasIdentity: !!identity.data?.positioning,
    pillars: (pillars.data ?? []) as { name: string | null; pct: number | null }[],
    planBuilt: !!strategy.data?.built_at,
    organic,
    organicDone,
    posts: { draft, ready, published },
    upcoming: ((upcoming.data ?? []) as { id: string; channel: string | null; scheduled_date: string | null; status: string; idea: string | null; caption: string | null }[]).map((p): UpcomingPost => ({ id: p.id, channel: p.channel, scheduled_date: p.scheduled_date, status: p.status, text: (p.caption || p.idea || "").slice(0, 140) })),
    assets,
    rules,
    guides,
    personas: (personas.data ?? []) as { name: string; priority: string }[],
    ideas: { total: (ideas.data ?? []).length, toSort: (ideas.data ?? []).filter((i) => i.status === "a_trier").length, kept: (ideas.data ?? []).filter((i) => i.status === "retenue").length },
  };
});
