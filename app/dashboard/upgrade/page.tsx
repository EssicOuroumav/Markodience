import PricingCards from "@/components/PricingCards";
import { getDashboardContext } from "@/lib/brand";
import { dateLabel } from "@/lib/kpi";
import { PLANS, formatXof, isPlanId } from "@/lib/plans";

const MESSAGES: Record<string, { cls: string; text: string }> = {
  cancelled: { cls: "bg-warning/15", text: "Paiement annulé. Aucun montant n'a été débité." },
  pending: { cls: "bg-warning/15", text: "Votre paiement n'est pas encore confirmé. Si vous avez payé, patientez quelques instants puis actualisez la page." },
  error: { cls: "bg-danger/15", text: "Nous n'avons pas pu confirmer ce paiement. Si vous avez été débité, contactez-nous avec votre reçu." },
};

export default async function UpgradePage(props: { searchParams: Promise<{ status?: string; reason?: string }> }) {
  const searchParams = await props.searchParams;
  const { plan, periodEnd, seats, supabase, user } = await getDashboardContext();
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await supabase.from("ai_usage").select("count").eq("user_id", user.id).eq("day", today).maybeSingle();
  const used = usage?.count ?? 0;
  const { data: payments } = await supabase.from("payments").select("id, plan, seats, amount, status, created_at").order("created_at", { ascending: false }).limit(20);
  const STATUS: Record<string, { label: string; cls: string }> = { completed: { label: "Payé", cls: "bg-success/20" }, pending: { label: "En attente", cls: "bg-warning/25" }, cancelled: { label: "Annulé", cls: "bg-black/10" }, failed: { label: "Échoué", cls: "bg-danger/20" } };
  const msg = searchParams.status ? MESSAGES[searchParams.status] : undefined;
  return (
    <section>
      <h1 className="text-[32px]">Choisir mon palier</h1>
      <p className="mt-1 text-ink-secondary">
        Palier actuel : <strong>{PLANS[plan].label}</strong>
        {plan === "agence" ? ` (${seats} sièges)` : ""}
        {periodEnd ? ` · valable jusqu'au ${periodEnd}` : ""}
      </p>
      <p className="caption mt-1">Générations IA aujourd&apos;hui : {used} / {PLANS[plan].aiDailyLimit} (remise à zéro chaque jour à minuit UTC)</p>
      {searchParams.reason === "profiles" && (
        <p role="status" className="mt-4 rounded-btn bg-warning/15 px-4 py-3 text-[15px]">Vous avez atteint la limite de profils de marque de votre palier. Passez au palier supérieur pour en créer d&apos;autres.</p>
      )}
      {msg && <p role="status" className={`mt-4 rounded-btn px-4 py-3 text-[15px] ${msg.cls}`}>{msg.text}</p>}
      <div className="mt-8"><PricingCards currentPlan={plan} /></div>
      {(payments ?? []).length > 0 && (
        <section className="mt-14" aria-labelledby="hist-h">
          <h2 id="hist-h" className="section-title">Historique de vos paiements</h2>
          <div className="card-flat mt-4 overflow-x-auto !p-0">
            <table className="w-full min-w-[520px] text-left text-[15px]">
              <thead className="border-b hairline text-[13px] uppercase tracking-wide text-ink-secondary"><tr><th className="px-5 py-3 font-medium">Date</th><th className="px-3 py-3 font-medium">Palier</th><th className="px-3 py-3 font-medium">Montant</th><th className="px-5 py-3 font-medium">Statut</th></tr></thead>
              <tbody className="divide-y divide-[var(--color-border-soft)]">
                {(payments ?? []).map((p) => (
                  <tr key={p.id}>
                    <td className="px-5 py-3.5">{dateLabel(p.created_at)}</td>
                    <td className="px-3 py-3.5">{isPlanId(p.plan) ? PLANS[p.plan].label : p.plan}{p.plan === "agence" ? ` · ${p.seats} sièges` : ""}</td>
                    <td className="num px-3 py-3.5 font-semibold">{formatXof(p.amount)}</td>
                    <td className="px-5 py-3.5"><span className={`rounded-pill px-3 py-1 text-[13px] font-medium ${STATUS[p.status]?.cls ?? ""}`}>{STATUS[p.status]?.label ?? p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption mt-3">Le reçu détaillé de chaque paiement vous est envoyé par PayDunya.</p>
        </section>
      )}
    </section>
  );
}
