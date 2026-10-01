import Link from "next/link";
import { AlertCircle, Clock } from "lucide-react";
import { dateLabel } from "@/lib/kpi";
import { PLANS, isPlanId } from "@/lib/plans";
import { subscriptionNotice } from "@/lib/subscription";

/** Bandeau d'avertissement : abonnement bientôt échu ou déjà échu. */
export default function SubscriptionBanner({ plan, periodEnd, owner }: { plan: string; periodEnd: string | null; owner: boolean }) {
  const notice = subscriptionNotice(plan, periodEnd, owner);
  if (!notice || !periodEnd) return null;
  const label = isPlanId(plan) ? PLANS[plan].label : "";
  const expiring = notice.kind === "expiring";
  return (
    <div role="status" className={`mb-6 flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4 ${expiring ? "border-warning/40 bg-warning/12" : "border-black/10 bg-white"} shadow-card`}>
      <span aria-hidden className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${expiring ? "bg-warning/30" : "bg-canvas"}`}>{expiring ? <Clock size={18} /> : <AlertCircle size={18} />}</span>
      <p className="min-w-0 flex-1 text-[15px]">
        {expiring
          ? <>Votre palier <strong>{label}</strong> expire {notice.days === 0 ? "aujourd’hui" : notice.days === 1 ? "demain" : `dans ${notice.days} jours`} (le {dateLabel(periodEnd)}). Renouvelez-le pour garder l’accès à tous vos onglets.</>
          : <>Votre abonnement a expiré le {dateLabel(periodEnd)}. Vos données sont conservées, mais les onglets payants sont en lecture seule jusqu’au renouvellement.</>}
      </p>
      <Link href="/dashboard/upgrade" className="btn-primary !px-5 !py-2 !text-[15px]">Renouveler</Link>
    </div>
  );
}
