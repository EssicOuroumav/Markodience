import { formatXof } from "@/lib/plans";
import { loadAdminData } from "@/lib/adminData";

const dateFr = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" }) : "—");
const STATUS: Record<string, string> = { completed: "bg-success/20", pending: "bg-warning/25", failed: "bg-danger/20", cancelled: "bg-black/8" };

export default async function AdminPayments() {
  const { payments, stats } = await loadAdminData();
  return (
    <div>
      <h1 className="text-[32px]">Paiements</h1>
      <p className="mt-1 text-[16px] text-ink-secondary">Revenus confirmés : {formatXof(stats.revenueTotal)} au total, {formatXof(stats.revenueMonth)} ce mois-ci.</p>
      <div className="card-flat mt-6 overflow-x-auto !p-0">
        <table className="w-full min-w-[720px] text-left text-[15px]">
          <thead className="border-b border-[var(--color-border-soft)] text-[13px] uppercase tracking-wide text-ink-secondary">
            <tr><th className="px-5 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Utilisateur</th><th className="px-3 py-3 font-medium">Palier</th><th className="px-3 py-3 font-medium">Montant</th><th className="px-3 py-3 font-medium">Prestataire</th><th className="px-5 py-3 font-medium">Statut</th></tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border-soft)]">
            {payments.length === 0 && <tr><td colSpan={6} className="px-5 py-10 text-center text-ink-secondary">Aucun paiement pour l’instant.</td></tr>}
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-4">{dateFr(p.created_at)}</td>
                <td className="max-w-[220px] truncate px-3 py-4" title={p.email}>{p.email}</td>
                <td className="px-3 py-4 capitalize">{p.plan}{p.plan === "agence" ? ` · ${p.seats}` : ""}</td>
                <td className="px-3 py-4 font-semibold">{formatXof(p.amount)}</td>
                <td className="px-3 py-4">{p.provider}</td>
                <td className="px-5 py-4"><span className={`rounded-pill px-3 py-1 text-[13px] font-medium ${STATUS[p.status] ?? ""}`}>{p.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
