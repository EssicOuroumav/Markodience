import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil } from "lucide-react";
import EditBrandForm from "@/components/EditBrandForm";
import PageHeader from "@/components/PageHeader";
import { getDashboardContext } from "@/lib/brand";

export default async function EditBrandPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { profiles, user } = await getDashboardContext();
  // `profiles` ne contient que les marques de l'utilisateur (sécurité au niveau des lignes) : une marque d'autrui donne un 404.
  const brand = profiles.find((p) => p.id === id);
  if (!brand) notFound();
  return (
    <div className="mx-auto max-w-xl space-y-8">
      <Link href="/dashboard/brands" className="btn-ghost -ml-4"><ArrowLeft size={17} />Mes marques</Link>
      <PageHeader icon={Pencil} title="Modifier la marque" description={`Mettez à jour le nom, le logo ou la couleur de ${brand.name}. L'interface prendra la nouvelle couleur.`} />
      <div className="card-flat !p-8"><EditBrandForm userId={user.id} brand={brand} /></div>
    </div>
  );
}
