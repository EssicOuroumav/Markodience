import Link from "next/link";
import { ArrowLeft, PlusCircle } from "lucide-react";
import { redirect } from "next/navigation";
import NewBrandForm from "@/components/NewBrandForm";
import PageHeader from "@/components/PageHeader";
import { getDashboardContext } from "@/lib/brand";
import { canCreateProfile } from "@/lib/plans";

export default async function NewBrandPage() {
  const { profiles, plan, owner, user } = await getDashboardContext();
  if (!owner && !canCreateProfile(plan, profiles.length)) redirect("/dashboard/upgrade?reason=profiles");
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <Link href="/dashboard/brands" className="btn-ghost -ml-4"><ArrowLeft size={17} />Mes marques</Link>
      <PageHeader icon={PlusCircle} title="Nouvelle marque" description="Ajoutez une marque, une organisation ou un projet. Chaque marque a sa propre stratégie, ses audits et ses rapports." />
      <div className="card-flat !p-8"><NewBrandForm userId={user.id} /></div>
    </div>
  );
}
