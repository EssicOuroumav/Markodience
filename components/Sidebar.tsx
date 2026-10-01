"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Crown, CreditCard, Lock, LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { hasFeature, PLANS, type PlanId } from "@/lib/plans";
import { TABS } from "@/lib/tabs";
import { TAB_ICONS } from "@/lib/tabIcons";
import BrandLogo, { type Shape } from "./BrandLogo";
import UserMenu from "./UserMenu";

type Props = { plan: PlanId; owner: boolean; email: string; brand: { name: string; sector: string | null; logo_url: string | null; primary_color: string | null } };

export default function Sidebar({ plan, owner, email, brand }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  const [shape, setShape] = useState<Shape | null>(null);
  const stacked = shape === "wide";
  const items = TABS.map((t) => {
    const Icon = TAB_ICONS[t.slug];
    const href = `/dashboard/${t.slug}`;
    const active = pathname === href;
    const locked = !hasFeature(plan, t.feature);
    return (
      <Link key={t.slug} href={href} aria-current={active ? "page" : undefined}
        className={`group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[15px] font-medium transition ${active ? "bg-accent-soft text-accent" : "text-ink/80 hover:bg-black/[0.04] hover:text-ink"}`}>
        {active && <span aria-hidden className="absolute -left-3 top-2 hidden h-7 w-1 rounded-r-full bg-accent md:block" />}
        <Icon size={19} strokeWidth={active ? 2.1 : 1.8} className="shrink-0" />
        <span className="flex-1">{t.label}</span>
        {locked && <Lock aria-label="Verrouillé" size={14} className="shrink-0 text-ink-secondary" />}
      </Link>
    );
  });

  return (
    <aside aria-label="Navigation du profil de marque" className="border-b border-[var(--color-border-soft)] bg-white md:fixed md:bottom-0 md:left-0 md:top-14 md:flex md:w-[272px] md:flex-col md:border-b-0 md:border-r">
      <div className={`hidden border-b border-[var(--color-border-soft)] p-5 md:flex ${stacked ? "flex-col items-start gap-3" : "items-center gap-3"}`}>
        <BrandLogo src={brand.logo_url} name={brand.name} color={brand.primary_color} size="md" onShape={setShape} />
        <div className="min-w-0 max-w-full">
          <p className="truncate text-[16px] font-semibold tracking-heading" title={brand.name}>{brand.name}</p>
          <p className="caption truncate">{brand.sector ?? "Secteur non renseigné"}</p>
        </div>
      </div>

      <nav aria-label="Onglets" className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:overflow-y-auto md:px-3 md:py-4">
        {items}
        <Link href="/dashboard/upgrade" className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink/80 md:hidden">
          <CreditCard size={19} strokeWidth={1.8} className="shrink-0" /><span>Mon palier</span>
        </Link>
        <button type="button" onClick={logout} className="flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink/80 md:hidden">
          <LogOut size={19} strokeWidth={1.8} className="shrink-0" /><span>Déconnexion</span>
        </button>
        {owner && (
          <Link href="/admin" aria-current={pathname.startsWith("/admin") ? "page" : undefined} className="mt-2 flex shrink-0 items-center gap-3 whitespace-nowrap rounded-xl px-3 py-2.5 text-[15px] font-medium text-ink/80 transition hover:bg-black/[0.04] md:mt-4">
            <ShieldCheck size={19} strokeWidth={1.8} className="shrink-0" />
            <span>Espace admin</span>
          </Link>
        )}
      </nav>

      <div className="hidden space-y-3 border-t border-[var(--color-border-soft)] p-4 md:block">
        <Link href="/dashboard/upgrade" className="flex items-center gap-3 rounded-2xl bg-night p-3.5 text-white transition hover:opacity-95">
          <span aria-hidden className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12"><Crown size={18} /></span>
          <span className="min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">{owner ? "Propriétaire" : `Palier ${PLANS[plan].label}`}</span>
            <span className="block text-[12px] text-white/65">{owner ? "Accès complet, sans quota" : plan === "gratuit" ? "Passer au palier Pro" : "Gérer mon palier"}</span>
          </span>
        </Link>
        <UserMenu email={email} owner={owner} />
      </div>
    </aside>
  );
}
