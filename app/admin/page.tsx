import { Activity, CreditCard, Layers, TrendingUp, Users, Wallet } from "lucide-react";
import { formatXof } from "@/lib/plans";
import { loadAdminData } from "@/lib/adminData";

const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export default async function AdminHome() {
  const { stats, users, payments } = await loadAdminData();
  const tiles = [
    { Icon: Users, label: "Utilisateurs", value: String(stats.users), hint: `${stats.paying} abonné(s) payant(s)` },
    { Icon: Wallet, label: "Revenus du mois", value: formatXof(stats.revenueMonth), hint: `${formatXof(stats.revenueTotal)} au total` },
    { Icon: Activity, label: "Générations IA aujourd’hui", value: String(stats.aiToday), hint: "Tous utilisateurs confondus" },
    { Icon: Layers, label: "Profils de marque", value: String(stats.brands), hint: "Créés sur la plateforme" },
  ];
  const total = Math.max(stats.users, 1);
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-[32px]">Vue d’ensemble</h1>
        <p className="mt-1 text-[16px] text-ink-secondary">L’activité de Markodience en un coup d’œil.</p>
      </div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ Icon, label, value, hint }) => (
          <div key={label} className="card-flat">
            <span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Icon size={20} strokeWidth={1.8} /></span>
            <p className="mt-4 text-[14px] text-ink-secondary">{label}</p>
            <p className="mt-1 text-[30px] font-semibold leading-none tracking-[-0.02em]">{value}</p>
            <p className="caption mt-2">{hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card-flat">
          <h2 className="flex items-center gap-2 text-[20px]"><TrendingUp size={20} className="text-accent" />Répartition par palier</h2>
          <ul className="mt-5 space-y-4">
            {(["gratuit", "pro", "agence"] as const).map((p) => (
              <li key={p}>
                <div className="flex justify-between text-[15px]"><span className="capitalize">{p}</span><span className="font-medium">{stats.byPlan[p]}</span></div>
                <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-canvas"><div className="h-full rounded-full bg-accent" style={{ width: `${(stats.byPlan[p] / total) * 100}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
        <section className="card-flat">
          <h2 className="flex items-center gap-2 text-[20px]"><CreditCard size={20} className="text-accent" />Derniers paiements</h2>
          {payments.length === 0 ? <p className="mt-4 text-ink-secondary">Aucun paiement pour l’instant.</p> : (
            <ul className="mt-4 divide-y divide-[var(--color-border-soft)]">
              {payments.slice(0, 5).map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-3 text-[15px]">
                  <span className="min-w-0"><span className="block truncate font-medium">{p.email}</span><span className="caption">{dateFr(p.created_at)} · {p.plan}</span></span>
                  <span className="text-right"><span className="block font-semibold">{formatXof(p.amount)}</span><span className={`caption ${p.status === "completed" ? "!text-success" : ""}`}>{p.status}</span></span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="card-flat">
        <h2 className="text-[20px]">Derniers inscrits</h2>
        <ul className="mt-4 divide-y divide-[var(--color-border-soft)]">
          {users.slice(0, 6).map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3 py-3 text-[15px]">
              <span className="min-w-0 truncate font-medium">{u.email}</span>
              <span className="caption shrink-0">{dateFr(u.createdAt)} · {u.owner ? "propriétaire" : u.plan}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
