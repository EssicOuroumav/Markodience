import Navbar from "@/components/Navbar";
import BrandSwitcher from "@/components/BrandSwitcher";
import Sidebar from "@/components/Sidebar";
import { getDashboardContext } from "@/lib/brand";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { profiles, active } = await getDashboardContext();
  return (
    <>
      <Navbar>
        <BrandSwitcher profiles={profiles} activeId={active.id} />
      </Navbar>
      <div className="pt-14">
        <Sidebar />
        <main className="mx-auto max-w-5xl px-6 pb-16 pt-8 md:ml-64">
          <header className="mb-8 flex items-center gap-4">
            {active.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.logo_url} alt={`Logo de ${active.name}`} className="h-12 w-12 rounded-btn object-cover" />
            ) : (
              <div aria-hidden className="h-12 w-12 rounded-btn" style={{ background: active.primary_color ?? "var(--color-accent)" }} />
            )}
            <div>
              <p className="text-[22px] font-semibold tracking-heading" style={{ color: active.primary_color ?? undefined }}>
                {active.name}
              </p>
              <p className="caption">{active.sector ?? "Secteur non renseigné"}</p>
            </div>
          </header>
          {children}
        </main>
      </div>
    </>
  );
}
