import AdminUserActions from "@/components/AdminUserActions";
import { requireAdmin } from "@/lib/admin";
import { loadAdminData } from "@/lib/adminData";

const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" }) : "—");
const PLAN_STYLE: Record<string, string> = { gratuit: "bg-black/5", pro: "bg-accent-soft text-accent", agence: "bg-night text-white" };

export default async function AdminUsers() {
  const me = await requireAdmin();
  const { users } = await loadAdminData();
  return (
    <div>
      <h1 className="text-[32px]">Utilisateurs</h1>
      <p className="mt-1 text-[16px] text-ink-secondary">{users.length} compte(s). « Gérer » permet d’offrir un palier, de remettre un quota à zéro ou de suspendre un compte.</p>
      <div className="card-flat mt-6 overflow-x-auto !p-0">
        <table className="w-full min-w-[820px] text-left text-[15px]">
          <thead className="border-b border-[var(--color-border-soft)] text-[13px] uppercase tracking-wide text-ink-secondary">
            <tr><th className="px-5 py-3 font-medium">Utilisateur</th><th className="px-3 py-3 font-medium">Palier</th><th className="px-3 py-3 font-medium">Marques</th><th className="px-3 py-3 font-medium">IA aujourd’hui</th><th className="px-3 py-3 font-medium">Inscrit</th><th className="px-3 py-3 font-medium">Dernière connexion</th><th className="px-5 py-3" /></tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {users.map((u) => (
              <tr key={u.id} className="align-top">
                <td className="px-5 py-4"><span className="block max-w-[240px] truncate font-medium" title={u.email}>{u.email}</span>
                  {u.owner && <span className="chip mt-1">Propriétaire</span>}{u.banned && <span className="mt-1 inline-block rounded-pill bg-danger/15 px-2.5 py-0.5 text-[12px] font-medium">Suspendu</span>}</td>
                <td className="px-3 py-4"><span className={`rounded-pill px-3 py-1 text-[13px] font-medium capitalize ${PLAN_STYLE[u.plan] ?? ""}`}>{u.plan}{u.plan === "agence" ? ` · ${u.seats}` : ""}</span>
                  <span className="caption mt-1 block">{u.planEnd ? `jusqu’au ${dateFr(u.planEnd)}` : u.plan === "gratuit" ? "" : "permanent"}</span></td>
                <td className="px-3 py-4">{u.brands}</td>
                <td className="px-3 py-4">{u.aiToday}</td>
                <td className="px-3 py-4">{dateFr(u.createdAt)}</td>
                <td className="px-3 py-4">{dateFr(u.lastSignIn)}</td>
                <td className="px-5 py-4"><AdminUserActions userId={u.id} plan={u.plan} banned={u.banned} isSelf={u.id === me.id} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
