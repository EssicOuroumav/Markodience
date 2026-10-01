"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronRight, CreditCard, Crown, Home, Layers, Lock, LogOut, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasFeature, PLANS, type PlanId } from "@/lib/plans";
import { TABS, type TabSlug } from "@/lib/tabs";
import { TAB_ICONS } from "@/lib/tabIcons";
import BrandLogo, { type Shape } from "./BrandLogo";
import UserMenu from "./UserMenu";

type Props = {
  plan: PlanId;
  owner: boolean;
  email: string;
  brand: { name: string; sector: string | null; logo_url: string | null; primary_color: string | null };
  progress: { percent: number; done: Partial<Record<TabSlug, boolean>> };
  brandCount: number;
  brandMax: number | null;
};

const SECTION = "px-3 pb-1.5 pt-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-ink-secondary/70";

/** Ligne de navigation : tuile d'icône, libellé, état (terminé / verrouillé / compteur). */
function NavItem({ href, active, Icon, label, children }: { href: string; active: boolean; Icon: React.ElementType; label: string; children?: React.ReactNode }) {
  return (
    <Link href={href} aria-current={active ? "page" : undefined}
      className={`group relative flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-2 py-1 text-[15px] font-medium transition duration-200 md:px-2.5 ${active ? "bg-white text-ink shadow-[0_1px_2px_rgba(16,24,40,0.06),0_6px_16px_rgba(0,113,227,0.10)] ring-1 ring-accent/15" : "text-ink/75 hover:bg-white/70 hover:text-ink"}`}>
      {active && <span aria-hidden className="absolute -left-3 top-1/2 hidden h-6 w-1 -translate-y-1/2 rounded-r-full bg-accent md:block" />}
      <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[11px] transition duration-300 ${active ? "bg-accent text-white shadow-glow" : "bg-black/[0.04] text-ink/70 group-hover:scale-105 group-hover:bg-accent-soft group-hover:text-accent"}`}>
        <Icon size={18} strokeWidth={active ? 2.1 : 1.8} />
      </span>
      <span className="flex-1">{label}</span>
      {children}
    </Link>
  );
}

export default function Sidebar({ plan, owner, email, brand, progress, brandCount, brandMax }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [shape, setShape] = useState<Shape | null>(null);
  const stacked = shape === "wide";

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside aria-label="Navigation du profil de marque" className="border-b border-[var(--color-border-soft)] bg-gradient-to-b from-white via-white to-canvas md:fixed md:bottom-0 md:left-0 md:top-14 md:flex md:w-[284px] md:flex-col md:border-b-0 md:border-r">
      {/* Carte de la marque : cliquable, ramène à la vue d'ensemble */}
      <Link href="/dashboard" aria-label={`${brand.name} : retour à la vue d'ensemble`} className="group relative hidden overflow-hidden border-b hairline p-5 pb-4 outline-offset-[-2px] md:block">
        <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${brand.primary_color ?? "var(--color-accent)"}, transparent)` }} />
        <span aria-hidden className="absolute inset-0 bg-gradient-to-br from-accent-soft/70 via-transparent to-transparent opacity-0 transition duration-500 group-hover:opacity-100" />
        <div className={`relative flex ${stacked ? "flex-col items-start gap-3" : "items-center gap-3.5"}`}>
          <BrandLogo src={brand.logo_url} name={brand.name} color={brand.primary_color} size="md" onShape={setShape} className="!transition-all duration-300 group-hover:-translate-y-0.5 group-hover:scale-[1.04] group-hover:shadow-card-hover" />
          <div className="min-w-0 max-w-full">
            {stacked ? (
              <p className="caption truncate" title={brand.name}><span className="font-medium text-ink/80">{brand.name}</span> · {brand.sector ?? "Secteur non renseigné"}</p>
            ) : (
              <>
                <p className="truncate text-[16px] font-semibold tracking-heading" title={brand.name}>{brand.name}</p>
                <p className="caption truncate">{brand.sector ?? "Secteur non renseigné"}</p>
              </>
            )}
          </div>
          <ChevronRight aria-hidden size={16} className={`${stacked ? "absolute right-0 top-1" : "ml-auto"} shrink-0 text-ink-secondary/60 transition duration-300 group-hover:translate-x-0.5 group-hover:text-accent`} />
        </div>
        {/* Progression de la stratégie */}
        <div className="relative mt-4">
          <div className="flex items-center justify-between text-[12px]"><span className="font-medium text-ink-secondary">Stratégie complète</span><span className="num font-semibold text-ink">{progress.percent} %</span></div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/[0.06]" role="progressbar" aria-valuenow={progress.percent} aria-valuemin={0} aria-valuemax={100} aria-label="Progression de la stratégie">
            <div className="bar-in h-full rounded-full bg-gradient-to-r from-accent to-[#5aa9ff]" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      </Link>

      <nav aria-label="Onglets" className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:gap-0.5 md:overflow-y-auto md:px-3 md:pb-4 md:pt-1">
        <p className={`${SECTION} hidden md:block`}>Votre marque</p>
        <NavItem href="/dashboard" active={pathname === "/dashboard"} Icon={Home} label="Vue d’ensemble" />
        {TABS.map((t) => {
          const Icon = TAB_ICONS[t.slug];
          const locked = !hasFeature(plan, t.feature);
          const done = !!progress.done[t.slug] && !locked;
          return (
            <NavItem key={t.slug} href={`/dashboard/${t.slug}`} active={pathname === `/dashboard/${t.slug}`} Icon={Icon} label={t.label}>
              {locked ? (
                <span className="flex shrink-0 items-center gap-1 rounded-pill bg-black/[0.05] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-ink-secondary" title="Réservé aux paliers payants"><Lock size={10} aria-label="Verrouillé" />Pro</span>
              ) : done ? (
                <span aria-label="Terminé" title="Terminé" className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-success text-white"><Check size={11} strokeWidth={3.5} /></span>
              ) : null}
            </NavItem>
          );
        })}

        <p className={`${SECTION} hidden !pt-3 md:block`}>Gestion</p>
        <NavItem href="/dashboard/brands" active={pathname.startsWith("/dashboard/brands")} Icon={Layers} label="Mes marques">
          <span className="num shrink-0 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{brandCount}{brandMax === null ? "" : `/${brandMax}`}</span>
        </NavItem>
        <NavItem href="/dashboard/upgrade" active={pathname === "/dashboard/upgrade"} Icon={CreditCard} label="Mon palier" />
        {owner && <NavItem href="/admin" active={pathname.startsWith("/admin")} Icon={ShieldCheck} label="Espace admin" />}
        <button type="button" onClick={logout} className="group flex shrink-0 items-center gap-3 whitespace-nowrap rounded-2xl px-2 py-1.5 text-[15px] font-medium text-ink/75 md:hidden">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-[11px] bg-black/[0.04]"><LogOut size={18} strokeWidth={1.8} /></span>Déconnexion
        </button>
      </nav>

      <div className="hidden space-y-3 border-t border-[var(--color-border-soft)] p-4 md:block">
        <Link href="/dashboard/upgrade" className="group relative flex items-center gap-3 overflow-hidden rounded-2xl bg-night p-3.5 text-white transition hover:opacity-95">
          <span aria-hidden className="orb absolute -right-6 -top-8 h-24 w-24 rounded-full bg-accent/40 blur-2xl" />
          <span aria-hidden className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-white/12"><Crown size={18} /></span>
          <span className="relative min-w-0 flex-1">
            <span className="block text-[14px] font-semibold">{owner ? "Propriétaire" : `Palier ${PLANS[plan].label}`}</span>
            <span className="block text-[12px] text-white/65">{owner ? "Accès complet, sans quota" : plan === "gratuit" ? "Passer au palier Pro" : "Gérer mon palier"}</span>
          </span>
          <ChevronRight aria-hidden size={16} className="relative text-white/50 transition group-hover:translate-x-0.5" />
        </Link>
        <UserMenu email={email} owner={owner} />
      </div>
    </aside>
  );
}
