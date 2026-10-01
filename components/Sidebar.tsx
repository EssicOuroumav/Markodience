"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { hasFeature, type PlanId } from "@/lib/plans";
import { TABS } from "@/lib/tabs";

export default function Sidebar({ plan }: { plan: PlanId }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Onglets du profil de marque"
      className="flex gap-1 overflow-x-auto border-b border-line bg-bg-secondary px-3 py-2 md:fixed md:bottom-0 md:left-0 md:top-14 md:w-64 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-6"
    >
      {TABS.map((t) => {
        const href = `/dashboard/${t.slug}`;
        const active = pathname === href;
        const locked = !hasFeature(plan, t.feature);
        return (
          <Link
            key={t.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-btn px-3 py-2 text-[15px] transition ${active ? "bg-bg font-semibold text-accent shadow-sm" : "text-ink hover:bg-black/5"}`}
          >
            {t.label}
            {locked && (
              <span className="text-ink-secondary" title="Réservé aux paliers payants">
                <svg aria-label="Verrouillé" role="img" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
              </span>
            )}
            {!locked && !t.ready && <span className="rounded-pill bg-black/5 px-2 py-0.5 text-[11px] text-ink-secondary">bientôt</span>}
          </Link>
        );
      })}
      <Link href="/dashboard/upgrade" aria-current={pathname === "/dashboard/upgrade" ? "page" : undefined}
        className="mt-2 shrink-0 whitespace-nowrap rounded-btn px-3 py-2 text-[15px] text-accent hover:bg-black/5 md:mt-auto">
        Mon palier
      </Link>
    </nav>
  );
}
