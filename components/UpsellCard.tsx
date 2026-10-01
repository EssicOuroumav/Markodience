import Link from "next/link";
import { PLANS, formatXof } from "@/lib/plans";

/** Affichée à la place d'un onglet non inclus dans le plan actif. */
export default function UpsellCard({ title, pitch }: { title: string; pitch: string }) {
  return (
    <section className="flex justify-center py-10">
      <div className="glass-float w-full max-w-lg rounded-card p-8 text-center shadow-card-hover">
        <svg aria-hidden className="mx-auto text-ink-secondary" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
        <h1 className="mt-3 text-[28px]">{title}</h1>
        <p className="mt-3 text-ink-secondary">{pitch}</p>
        <p className="caption mt-3">Inclus dès le palier Pro, à partir de {formatXof(PLANS.pro.price ?? 0)} par mois.</p>
        <Link href="/dashboard/upgrade?plan=pro" className="btn-primary mt-6">Passer au palier Pro</Link>
      </div>
    </section>
  );
}
