import JourneyBar from "@/components/JourneyBar";
import Image from "next/image";
import Link from "next/link";
import ProgressRefresher from "@/components/ProgressRefresher";
import BrandSwitcher from "@/components/BrandSwitcher";
import Sidebar from "@/components/Sidebar";
import SubscriptionBanner from "@/components/SubscriptionBanner";
import UpgradeToast from "@/components/UpgradeToast";
import { getDashboardContext } from "@/lib/brand";
import { journeySteps, journeyVisible, lockedStepCount } from "@/lib/journey";
import { PLANS, canCreateProfile } from "@/lib/plans";
import { getBrandProgress } from "@/lib/progress";
import { brandTheme } from "@/lib/theme";

export const metadata = { title: "Mon espace", robots: { index: false, follow: false } };

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profiles, active, plan, owner, user, periodEnd } = await getDashboardContext();
  const progress = await getBrandProgress();
  // Parcours guidé : étapes du palier, masqué une fois la marque terminée ou fermé par l'utilisateur (mémorisé dans son profil).
  const steps = journeySteps(plan, { ...progress.done, kpi: progress.kpiEver });
  const canAdd = owner || canCreateProfile(plan, profiles.length);
  const dismissed = Array.isArray(user.user_metadata?.journey_dismissed) ? (user.user_metadata.journey_dismissed as string[]) : [];
  return (
    <div className="studio relative min-h-screen bg-canvas" style={brandTheme(active.primary_color) as React.CSSProperties}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_70%_0%,rgb(var(--rgb-accent)/0.08),transparent)]" />
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-[var(--color-border-soft)] bg-white/90 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2"><Image src="/logo-mark.png" alt="" width={26} height={26} /><span className="text-[16px] font-semibold tracking-heading">Markodience</span></Link>
        <BrandSwitcher profiles={profiles} activeId={active.id} canCreate={canAdd} />
      </header>
      <div>
        <Sidebar plan={plan} owner={owner} email={user.email ?? ""} brand={active} progress={{ percent: progress.percent, done: progress.done }} brandCount={profiles.length} brandMax={owner ? null : PLANS[plan].maxProfiles}
          switcher={<BrandSwitcher profiles={profiles} activeId={active.id} canCreate={canAdd} variant="sidebar" />} />
        <main className="px-4 pb-20 pt-6 md:ml-[256px] md:px-8 md:pt-8">
          <SubscriptionBanner plan={plan} periodEnd={periodEnd} owner={owner} />
          <UpgradeToast />
          <ProgressRefresher />
          {children}
          {journeyVisible(steps, dismissed, active.id) && <JourneyBar steps={steps} brandId={active.id} dismissed={dismissed} lockedCount={lockedStepCount(plan)} />}
        </main>
      </div>
    </div>
  );
}
