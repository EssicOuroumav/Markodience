import JourneyBar from "@/components/JourneyBar";
import Navbar from "@/components/Navbar";
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
  const dismissed = Array.isArray(user.user_metadata?.journey_dismissed) ? (user.user_metadata.journey_dismissed as string[]) : [];
  return (
    <div className="relative min-h-screen bg-canvas" style={brandTheme(active.primary_color) as React.CSSProperties}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_70%_0%,rgb(var(--rgb-accent)/0.08),transparent)]" />
      <Navbar homeHref="/dashboard">
        <BrandSwitcher profiles={profiles} activeId={active.id} canCreate={owner || canCreateProfile(plan, profiles.length)} />
      </Navbar>
      <div className="pt-14">
        <Sidebar plan={plan} owner={owner} email={user.email ?? ""} brand={active} progress={{ percent: progress.percent, done: progress.done }} brandCount={profiles.length} brandMax={owner ? null : PLANS[plan].maxProfiles} />
        <main className="mx-auto max-w-[1360px] px-5 pb-20 pt-8 md:ml-[284px] md:px-10 md:pt-10">
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
