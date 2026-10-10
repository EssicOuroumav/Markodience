"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronRight, CreditCard, Crown, Home, Layers, Lock, LogOut, ShieldCheck, UserCog } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { hasFeature, PLANS, type PlanId } from "@/lib/plans";
import Image from "next/image";
import { VISIBLE_TABS, TAB_GROUP, TAB_GROUPS, type TabSlug } from "@/lib/tabs";
import { TAB_ICONS } from "@/lib/tabIcons";
import UserMenu from "./UserMenu";

type Props = {
  plan: PlanId;
  owner: boolean;
  email: string;
  brand: { name: string; sector: string | null; logo_url: string | null; primary_color: string | null };
  progress: { percent: number; done: Partial<Record<TabSlug, boolean>> };
  brandCount: number;
  brandMax: number | null;
  /** Sélecteur de marque, affiché en haut du menu. */
  switcher: React.ReactNode;
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

export default function Sidebar({ plan, owner, email, progress, brandCount, brandMax, switcher }: Props) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside aria-label="Navigation du profil de marque" className="border-b border-[var(--color-border-soft)] bg-white md:fixed md:inset-y-0 md:left-0 md:flex md:w-[256px] md:flex-col md:border-b-0 md:border-r">
      <Link href="/dashboard" className="hidden h-14 shrink-0 items-center gap-2 px-5 text-ink md:flex">
        <Image src="/logo-mark.png" alt="" width={26} height={26} />
        <span className="text-[17px] font-semibold tracking-heading">Markodience</span>
      </Link>
      <div className="hidden px-3 pb-2 md:block">{switcher}</div>

      <nav aria-label="Onglets" className="flex gap-1 overflow-x-auto px-3 py-2 md:flex-1 md:flex-col md:gap-0.5 md:overflow-y-auto md:px-3 md:pb-4 md:pt-0">
        <NavItem href="/dashboard" active={pathname === "/dashboard"} Icon={Home} label="Vue d’ensemble" />
        {TAB_GROUPS.map((g) => (
          <div key={g.id} className="contents">
            <p className={`${SECTION} hidden md:block`}>{g.label}</p>
            {VISIBLE_TABS.filter((t) => TAB_GROUP[t.slug] === g.id).map((t) => {
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
          </div>
        ))}

        <p className={`${SECTION} hidden !pt-3 md:block`}>Gestion</p>
        <NavItem href="/dashboard/brands" active={pathname.startsWith("/dashboard/brands")} Icon={Layers} label="Mes marques">
          <span className="num shrink-0 rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{brandCount}{brandMax === null ? "" : `/${brandMax}`}</span>
        </NavItem>
        <NavItem href="/dashboard/upgrade" active={pathname === "/dashboard/upgrade"} Icon={CreditCard} label="Mon palier" />
        <NavItem href="/dashboard/account" active={pathname === "/dashboard/account"} Icon={UserCog} label="Mon compte" />
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
