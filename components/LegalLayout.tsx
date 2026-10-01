import Link from "next/link";
import Navbar from "./Navbar";
import SiteFooter from "./SiteFooter";

/** Cadre commun des pages légales : navigation, sommaire lisible et pied de page. */
export default function LegalLayout({ title, intro, updated, children }: { title: string; intro: string; updated: string; children: React.ReactNode }) {
  return (
    <>
      <Navbar>
        <Link href="/login" className="btn-ghost hidden sm:inline-flex">Se connecter</Link>
        <Link href="/signup" className="btn-primary !px-5 !py-2 !text-[15px]">Commencer</Link>
      </Navbar>
      <main className="bg-canvas pb-24 pt-28">
        <article className="mx-auto max-w-3xl px-5 md:px-6">
          <p className="eyebrow">Informations légales</p>
          <h1 className="mt-2 text-[clamp(32px,4.5vw,46px)] leading-tight tracking-[-0.03em]">{title}</h1>
          <p className="mt-3 text-[17px] text-ink-secondary">{intro}</p>
          <p className="caption mt-2">Dernière mise à jour : {updated}</p>
          <div className="legal mt-10 space-y-10 rounded-[28px] border border-[var(--color-border-soft)] bg-white p-7 shadow-card sm:p-10">{children}</div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}

export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section aria-labelledby={`s${n}`}>
      <h2 id={`s${n}`} className="text-[22px] leading-snug tracking-[-0.02em]"><span className="num mr-2 text-accent">{n}.</span>{title}</h2>
      <div className="mt-3 space-y-3 text-[16.5px] leading-relaxed text-ink/85 [&_a]:text-accent [&_a]:underline [&_li]:ml-5 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-ink">{children}</div>
    </section>
  );
}
