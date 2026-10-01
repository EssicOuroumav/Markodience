import Link from "next/link";
import { Lock } from "lucide-react";
import { PLANS, formatXof } from "@/lib/plans";
import { TABS } from "@/lib/tabs";
import { TAB_ILLUSTRATIONS } from "@/lib/tabIcons";
import { ILLUSTRATIONS } from "./illustrations";

/** Affichée à la place d'un onglet non inclus dans le plan actif. */
export default function UpsellCard({ title, pitch }: { title: string; pitch: string }) {
  const tab = TABS.find((t) => t.label === title);
  const Art = ILLUSTRATIONS[tab ? TAB_ILLUSTRATIONS[tab.slug] : "start"];
  return (
    <section className="flex justify-center py-6 md:py-12">
      <div className="glass-float relative w-full max-w-xl overflow-hidden rounded-[32px] p-8 text-center shadow-pop md:p-10">
        <div aria-hidden className="mesh absolute inset-0 -z-10" />
        <Art className="mx-auto w-56 max-w-full" />
        <span className="chip mt-2"><Lock size={13} />Inclus dès le palier Pro</span>
        <h1 className="mt-4 text-[32px] leading-tight">{title}</h1>
        <p className="mx-auto mt-3 max-w-md text-[17px] text-ink-secondary">{pitch}</p>
        <p className="caption mt-3">À partir de {formatXof(PLANS.pro.price ?? 0)} par mois, sans engagement.</p>
        <Link href="/dashboard/upgrade?plan=pro" className="btn-primary mt-7">Passer au palier Pro</Link>
      </div>
    </section>
  );
}
