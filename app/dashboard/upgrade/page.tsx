import PricingCards from "@/components/PricingCards";
import { getDashboardContext } from "@/lib/brand";
import { PLANS } from "@/lib/plans";

const MESSAGES: Record<string, { cls: string; text: string }> = {
  cancelled: { cls: "bg-warning/15", text: "Paiement annulé. Aucun montant n'a été débité." },
  pending: { cls: "bg-warning/15", text: "Votre paiement n'est pas encore confirmé. Si vous avez payé, patientez quelques instants puis actualisez la page." },
  error: { cls: "bg-danger/15", text: "Nous n'avons pas pu confirmer ce paiement. Si vous avez été débité, contactez-nous avec votre reçu." },
};

export default async function UpgradePage(props: { searchParams: Promise<{ status?: string; reason?: string }> }) {
  const searchParams = await props.searchParams;
  const { plan, periodEnd, seats } = await getDashboardContext();
  const msg = searchParams.status ? MESSAGES[searchParams.status] : undefined;
  return (
    <section>
      <h1 className="text-[28px]">Choisir mon palier</h1>
      <p className="mt-1 text-ink-secondary">
        Palier actuel : <strong>{PLANS[plan].label}</strong>
        {plan === "agence" ? ` (${seats} sièges)` : ""}
        {periodEnd ? ` · valable jusqu'au ${periodEnd}` : ""}
      </p>
      {searchParams.reason === "profiles" && (
        <p role="status" className="mt-4 rounded-btn bg-warning/15 px-4 py-3 text-[15px]">Vous avez atteint la limite de profils de marque de votre palier. Passez au palier supérieur pour en créer d&apos;autres.</p>
      )}
      {msg && <p role="status" className={`mt-4 rounded-btn px-4 py-3 text-[15px] ${msg.cls}`}>{msg.text}</p>}
      <div className="mt-8"><PricingCards currentPlan={plan} /></div>
    </section>
  );
}
