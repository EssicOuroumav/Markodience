import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Navbar from "@/components/Navbar";
import SiteFooter from "@/components/SiteFooter";
import { ILLUSTRATIONS } from "@/components/illustrations";

export const metadata = { title: "Page introuvable", robots: { index: false, follow: false } };

/** Page 404 de tout le site (adresse inconnue, `notFound()`, espace admin pour un non-propriétaire). Renvoie bien le code HTTP 404. */
export default function NotFound() {
  const Art = ILLUSTRATIONS.start;
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5 pb-16 pt-24">
        <section className="w-full max-w-lg rounded-[32px] bg-white p-8 text-center shadow-pop md:p-10">
          <Art className="mx-auto w-52 max-w-full" />
          <p className="eyebrow mt-2">Erreur 404</p>
          <h1 className="mt-3 text-[32px] leading-tight">Cette page n’existe pas</h1>
          <p className="mx-auto mt-3 max-w-sm text-[17px] text-ink-secondary">L’adresse est peut-être incorrecte, ou la page a été déplacée.</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href="/" className="btn-primary"><ArrowLeft size={18} />Retour à l’accueil</Link>
            <Link href="/dashboard" className="btn-ghost">Mon espace</Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
