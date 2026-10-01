import { Layers } from "lucide-react";
import BrandsList from "@/components/BrandsList";
import PageHeader from "@/components/PageHeader";
import { getDashboardContext } from "@/lib/brand";
import { PLANS, canCreateProfile } from "@/lib/plans";

export default async function BrandsPage() {
  const { profiles, active, plan, owner } = await getDashboardContext();
  const max = owner ? null : PLANS[plan].maxProfiles;
  const canAdd = owner || canCreateProfile(plan, profiles.length);
  const used = profiles.length;
  const next = plan === "gratuit" ? "Le palier Pro permet jusqu'à 3 marques, le palier Agence jusqu'à 10." : plan === "pro" ? "Le palier Agence permet jusqu'à 10 marques." : "Vous avez utilisé toutes les marques de votre palier.";
  return (
    <div className="space-y-8">
      <PageHeader icon={Layers} title="Mes marques" description="Gérez plusieurs marques depuis un seul compte : passez de l'une à l'autre en un clic, sans vous déconnecter." />
      <div className="card-flat flex flex-wrap items-center gap-6 !p-6">
        <div className="min-w-[200px] flex-1">
          <p className="caption">Marques utilisées</p>
          <p className="num mt-0.5 text-[30px] font-semibold leading-none tracking-[-0.03em]">{used}<span className="text-[18px] font-medium text-ink-secondary"> / {max === null ? "illimité" : max}</span></p>
          {max !== null && (
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-canvas"><div className="bar-in h-full rounded-full bg-gradient-to-r from-accent to-[#5aa9ff]" style={{ width: `${Math.min(100, (used / max) * 100)}%` }} /></div>
          )}
        </div>
        <p className="max-w-sm text-[14px] text-ink-secondary">{owner ? "En tant que propriétaire, vous n'avez aucune limite de marques." : `Palier ${PLANS[plan].label} : ${canAdd ? "vous pouvez encore ajouter des marques." : "limite atteinte."} ${canAdd ? "" : next}`}</p>
      </div>
      <BrandsList profiles={profiles} activeId={active.id} canAdd={canAdd} limitText={next} />
    </div>
  );
}
