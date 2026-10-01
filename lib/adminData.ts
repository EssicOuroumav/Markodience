import type { User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/payments/admin";

export type AdminUser = {
  id: string; email: string; createdAt: string; lastSignIn: string | null; banned: boolean; owner: boolean;
  plan: string; planEnd: string | null; seats: number; brands: number; aiToday: number;
};

const today = () => new Date().toISOString().slice(0, 10);

/** Lecture agrégée pour l'espace admin (clé service, serveur uniquement). */
export async function loadAdminData() {
  const admin = createAdminClient();
  const users: User[] = [];
  for (let page = 1; page <= 10; page++) {
    const { data } = await admin.auth.admin.listUsers({ page, perPage: 200 });
    users.push(...(data?.users ?? []));
    if ((data?.users.length ?? 0) < 200) break;
  }
  const [{ data: subs }, { data: brands }, { data: usage }, { data: payments }] = await Promise.all([
    admin.from("subscriptions").select("user_id, plan, status, seats, current_period_end"),
    admin.from("brand_profiles").select("user_id"),
    admin.from("ai_usage").select("user_id, count").eq("day", today()),
    admin.from("payments").select("id, user_id, plan, seats, amount, provider, status, created_at, confirmed_at").order("created_at", { ascending: false }).limit(200),
  ]);

  const rows: AdminUser[] = users
    .map((u) => {
      const s = (subs ?? []).find((x) => x.user_id === u.id);
      const expired = s?.current_period_end && s.current_period_end < today();
      return {
        id: u.id,
        email: u.email ?? "(sans email)",
        createdAt: u.created_at,
        lastSignIn: u.last_sign_in_at ?? null,
        banned: !!u.banned_until && new Date(u.banned_until) > new Date(),
        owner: u.app_metadata?.role === "admin",
        plan: s && s.status === "active" && !expired ? s.plan : "gratuit",
        planEnd: s?.current_period_end ?? null,
        seats: s?.seats ?? 1,
        brands: (brands ?? []).filter((b) => b.user_id === u.id).length,
        aiToday: (usage ?? []).find((x) => x.user_id === u.id)?.count ?? 0,
      };
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const month = today().slice(0, 7);
  const done = (payments ?? []).filter((p) => p.status === "completed");
  return {
    users: rows,
    payments: (payments ?? []).map((p) => ({ ...p, email: rows.find((r) => r.id === p.user_id)?.email ?? "(supprimé)" })),
    stats: {
      users: rows.length,
      paying: rows.filter((r) => r.plan !== "gratuit" && !r.owner).length,
      revenueMonth: done.filter((p) => (p.confirmed_at ?? p.created_at).startsWith(month)).reduce((n, p) => n + p.amount, 0),
      revenueTotal: done.reduce((n, p) => n + p.amount, 0),
      aiToday: (usage ?? []).reduce((n, x) => n + x.count, 0),
      brands: (brands ?? []).length,
      byPlan: { gratuit: rows.filter((r) => r.plan === "gratuit").length, pro: rows.filter((r) => r.plan === "pro").length, agence: rows.filter((r) => r.plan === "agence").length },
    },
  };
}
