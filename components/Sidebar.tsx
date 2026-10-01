"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TABS } from "@/lib/tabs";

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Onglets du profil de marque"
      className="flex gap-1 overflow-x-auto border-b border-line bg-bg-secondary px-3 py-2 md:fixed md:bottom-0 md:left-0 md:top-14 md:w-64 md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:px-3 md:py-6"
    >
      {TABS.map((t) => {
        const href = `/dashboard/${t.slug}`;
        const active = pathname === href;
        return (
          <Link
            key={t.slug}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex shrink-0 items-center justify-between gap-2 whitespace-nowrap rounded-btn px-3 py-2 text-[15px] transition ${active ? "bg-bg font-semibold text-accent shadow-sm" : "text-ink hover:bg-black/5"}`}
          >
            {t.label}
            {!t.ready && <span className="rounded-pill bg-black/5 px-2 py-0.5 text-[11px] text-ink-secondary">bientôt</span>}
          </Link>
        );
      })}
    </nav>
  );
}
