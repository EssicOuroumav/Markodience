import Navbar from "@/components/Navbar";
import BrandSwitcher from "@/components/BrandSwitcher";
import Sidebar from "@/components/Sidebar";
import UpgradeToast from "@/components/UpgradeToast";
import { getDashboardContext } from "@/lib/brand";
import { PLANS, canCreateProfile } from "@/lib/plans";
import { getBrandProgress } from "@/lib/progress";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profiles, active, plan, owner, user } = await getDashboardContext();
  const progress = await getBrandProgress();
  return (
    <div className="min-h-screen bg-canvas">
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
