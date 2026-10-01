import { notFound } from "next/navigation";
import { TABS } from "@/lib/tabs";

export default function ComingSoonTab({ params }: { params: { tab: string } }) {
  const tab = TABS.find((t) => t.slug === params.tab);
  if (!tab) notFound();
  return (
    <section className="card">
      <h1 className="text-[28px]">{tab.label}</h1>
      <p className="mt-2 text-ink-secondary">Cet onglet arrive bientôt. Il sera disponible dans une prochaine mise à jour.</p>
    </section>
  );
}
