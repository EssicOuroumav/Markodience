import Navbar from "@/components/Navbar";
import BrandSwitcher from "@/components/BrandSwitcher";
import Sidebar from "@/components/Sidebar";
import UpgradeToast from "@/components/UpgradeToast";
import { getDashboardContext } from "@/lib/brand";
import { PLANS, canCreateProfile } from "@/lib/plans";
import { getBrandProgress } from "@/lib/progress";
import { brandTheme } from "@/lib/theme";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profiles, active, plan, owner, user } = await getDashboardContext();
  const progress = await getBrandProgress();
  return (
    <div className="relative min-h-screen bg-canvas" style={brandTheme(active.primary_color) as React.CSSProperties}>
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-[radial-gradient(60%_100%_at_70%_0%,rgb(var(--rgb-accent)/0.08),transparent)]" />
      <Navbar homeHref="/dashboard">
        <BrandSwitcher profiles={profiles} activeId={active.id} canCreate={owner || canCreateProfile(plan, profiles.length)} />
      </Navbar>
      <div className="pt-14">
        <Sidebar plan={plan} owner={owner} email={user.email ?? ""} brand={active} progress={{ percent: progress.percent, done: progress.done }} brandCount={profiles.length} brandMax={owner ? null : PLANS[plan].maxProfiles} />
        <main className="mx-auto max-w-5xl px-5 pb-20 pt-8 md:ml-[284px] md:px-10 md:pt-10">
          <UpgradeToast />
          {children}
        </main>
      </div>
    </div>
  );
}
