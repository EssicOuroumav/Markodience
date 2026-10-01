import { redirect } from "next/navigation";
import Navbar from "@/components/Navbar";
import { createClient } from "@/lib/supabase/server";
import type { BrandProfile } from "@/types";

export default async function DashboardPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profiles } = await supabase
    .from("brand_profiles")
    .select("*")
    .order("created_at", { ascending: true })
    .returns<BrandProfile[]>();

  if (!profiles || profiles.length === 0) redirect("/signup");
  const brand = profiles[0];

  return (
    <>
      <Navbar />
      <main className="mx-auto max-w-6xl px-6 pb-12 pt-24">
        <div className="flex items-center gap-4">
          {brand.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logo_url} alt={`Logo de ${brand.name}`} className="h-12 w-12 rounded-btn object-cover" />
          )}
          <div>
            <h1 className="text-[28px]" style={{ color: brand.primary_color ?? undefined }}>{brand.name}</h1>
            <p className="caption">{brand.sector ?? "Secteur non renseigné"}</p>
          </div>
        </div>
        <p className="mt-8 text-ink-secondary">
          Votre espace est prêt. Les onglets de stratégie arrivent à l&apos;étape suivante.
        </p>
      </main>
    </>
  );
}
