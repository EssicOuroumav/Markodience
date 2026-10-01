import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Languages, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import ProductMockup from "@/components/ProductMockup";
import { ILLUSTRATIONS, type IllustrationName } from "@/components/illustrations";
import { PLANS } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#methode", label: "Méthode" },
  { href: "#tarifs", label: "Tarifs" },
  { href: "#faq", label: "FAQ" },
];

const FEATURES: { art: IllustrationName; title: string; text: string }[] = [
  { art: "identity", title: "Identité de marque", text: "Positionnement, cibles et palette générés à partir de quelques questions, puis modifiables en un clic." },
  { art: "audit", title: "Audit", text: "Déposez vos captures ou PDF : un score sur 100, vos points forts et des priorités d’amélioration." },
  { art: "pillars", title: "Piliers de contenu", text: "3 à 5 grands thèmes qui donnent de la cohérence à chacune de vos publications." },
  { art: "chat", title: "Tonalité & voix", text: "Ce qu’on dit, ce qu’on évite : la voix de la marque, claire pour toute l’équipe." },
  { art: "calendar", title: "Ligne éditoriale", text: "Une trame hebdomadaire par canal, avec rotation des piliers et validation horodatée." },
  { art: "chart", title: "KPIs & reporting", text: "Saisie mensuelle, rappel d’échéance et export PDF prêt à envoyer à vos clients." },
  { art: "rules", title: "Règles opérationnelles", text: "Planning, visuels, communauté, RGPD : toutes les règles de travail au même endroit." },
  { art: "live", title: "Guide Lives", text: "Trame par objectif, équipe, scripts et réponses rapides à copier en un clic pendant le live." },
];

const STEPS = [
  { n: "1", title: "Créez votre espace", text: "Un compte, un profil de marque avec son logo et sa couleur. Gérez plusieurs marques depuis le même compte." },
  { n: "2", title: "Générez votre stratégie", text: "Répondez à quelques questions : identité, piliers, tonalité et ligne éditoriale se construisent pour vous." },
  { n: "3", title: "Pilotez et validez", text: "Suivez l’avancement semaine par semaine, faites valider vos contenus et envoyez vos rapports PDF." },
];

const FAQ = [
  { q: "Markodience publie-t-il à ma place sur les réseaux sociaux ?", a: "Non, jamais. Markodience est un outil de structuration stratégique : il ne se connecte pas à vos comptes et ne publie rien. Vous gardez la main sur vos réseaux." },
  { q: "Comment puis-je payer ?", a: "Par mobile money (Orange Money, MTN, Moov, Wave…) ou par carte bancaire, en francs CFA. Les paiements sont traités par PayDunya." },
  { q: "Puis-je gérer plusieurs marques ?", a: "Oui. Le palier Gratuit inclut 1 profil, le Pro jusqu’à 3, et le palier Agence autorise un nombre illimité de profils." },
  { q: "Que contient le palier Gratuit ?", a: "L’identité de marque, les piliers de contenu et la tonalité, avec un nombre limité de générations par jour. Les autres onglets sont réservés au Pro et à l’Agence." },
  { q: "Mes données sont-elles protégées ?", a: "Chaque compte ne voit que ses propres données, isolées au niveau de la base. Les connexions sont chiffrées et aucune clé secrète n’est exposée dans l’application." },
];

const PLAN_BULLETS: Record<"gratuit" | "pro" | "agence", string[]> = {
  gratuit: ["1 profil de marque", "Identité, piliers, tonalité", "Exports avec filigrane"],
  pro: ["Jusqu’à 3 profils de marque", "Audit, ligne éditoriale, KPIs, règles, Guide Lives", "Workflow de validation", "Exports sans filigrane"],
  agence: ["Profils illimités", "Tout le palier Pro", "Marque blanche et export multi-clients", "Facturé par siège, 2 minimum"],
};

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const signedIn = !!user;
  const startHref = signedIn ? "/dashboard" : "/signup";
  return (
    <>
      <Navbar links={LINKS} homeHref={signedIn ? "/dashboard" : "/"}>
        {signedIn ? (
          <Link href="/dashboard" className="btn-primary !px-5 !py-2 !text-[15px]">Mon espace <ArrowRight size={16} /></Link>
        ) : (
          <>
            <Link href="/login" className="btn-ghost hidden sm:inline-flex">Se connecter</Link>
            <Link href="/signup" className="btn-primary !px-5 !py-2 !text-[15px]">Commencer</Link>
          </>
        )}
      </Navbar>

      <main>
        {/* Hero */}
        <section className="mesh relative overflow-hidden">
          <div aria-hidden className="grid-dots pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(60%_60%_at_50%_30%,black,transparent)]" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 pb-28 pt-32 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:pt-40">
            <div>
              <span className="chip">Pensé pour les community managers d&apos;Afrique de l&apos;Ouest</span>
              <h1 className="mt-6 text-[clamp(40px,6vw,68px)] font-semibold leading-[1.04] tracking-[-0.035em]">
                La stratégie de vos marques, <span className="text-accent">claire et structurée.</span>
              </h1>
              <p className="mt-6 max-w-xl text-[19px] leading-relaxed text-ink-secondary">
                Identité, piliers de contenu, ligne éditoriale, audit et reporting : tout ce qu’il faut pour gérer une marque comme un pro, généré avec l’IA et pensé pour votre réalité.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-4">
                <Link href={startHref} className="btn-primary">{signedIn ? "Accéder à mon espace" : "Créer mon espace gratuit"} <ArrowRight size={18} /></Link>
                <a href="#fonctionnalites" className="btn-secondary !rounded-pill !px-6 !py-3 !text-[17px]">Découvrir</a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-[14px] text-ink-secondary">
                {["Gratuit pour démarrer", "Paiement mobile money", "Aucun accès à vos réseaux"].map((t) => (
                  <li key={t} className="flex items-center gap-1.5"><Check size={16} className="text-success" strokeWidth={3} />{t}</li>
                ))}
              </ul>
            </div>
            <ProductMockup />
          </div>
        </section>

        {/* Bandeau de confiance */}
        <section aria-label="Points forts" className="border-y border-[var(--color-border-soft)] bg-white">
          <ul className="mx-auto grid max-w-6xl gap-6 px-5 py-8 sm:grid-cols-2 md:px-6 lg:grid-cols-4">
            {[
              { Icon: Smartphone, t: "Pensé pour le mobile", d: "Utilisable partout, même en déplacement." },
              { Icon: Languages, t: "100 % en français", d: "Interface et contenus générés en français." },
              { Icon: Wallet, t: "Mobile money & carte", d: "Paiement en francs CFA, sans carte étrangère." },
              { Icon: ShieldCheck, t: "Vos réseaux restent à vous", d: "Aucune connexion, aucune publication automatique." },
            ].map(({ Icon, t, d }) => (
              <li key={t} className="flex items-start gap-3">
                <span aria-hidden className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent"><Icon size={21} strokeWidth={1.8} /></span>
                <span><span className="block text-[16px] font-semibold">{t}</span><span className="block text-[14px] text-ink-secondary">{d}</span></span>
              </li>
            ))}
          </ul>
        </section>

        {/* Fonctionnalités */}
        <section id="fonctionnalites" className="scroll-mt-16 bg-canvas py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Fonctionnalités</p>
              <h2 className="mt-3 text-[clamp(30px,4vw,44px)] leading-tight tracking-[-0.03em]">Tout ce qu’il faut pour piloter une marque</h2>
              <p className="mt-4 text-[18px] text-ink-secondary">Huit modules qui travaillent ensemble : ce que vous définissez dans l’identité nourrit les piliers, la tonalité, puis la ligne éditoriale.</p>
            </div>
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f) => {
                const Art = ILLUSTRATIONS[f.art];
                return (
                  <article key={f.title} className="card group flex flex-col !p-5">
                    <div className="rounded-2xl bg-canvas p-3 transition duration-300 group-hover:bg-accent-soft"><Art className="mx-auto h-36 w-full" /></div>
                    <h3 className="mt-5 text-[19px]">{f.title}</h3>
                    <p className="mt-1.5 text-[15px] leading-relaxed text-ink-secondary">{f.text}</p>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Méthode */}
        <section id="methode" className="scroll-mt-16 bg-white py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Méthode</p>
              <h2 className="mt-3 text-[clamp(30px,4vw,44px)] leading-tight tracking-[-0.03em]">De zéro à une stratégie complète en 3 étapes</h2>
            </div>
            <ol className="relative mt-14 grid gap-10 md:grid-cols-3">
              <div aria-hidden className="absolute left-[16%] right-[16%] top-7 hidden border-t-2 border-dashed border-accent/25 md:block" />
              {STEPS.map((s) => (
                <li key={s.n} className="relative text-center">
                  <span className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent text-[22px] font-semibold text-white shadow-glow">{s.n}</span>
                  <h3 className="mt-5 text-[21px]">{s.title}</h3>
                  <p className="mx-auto mt-2 max-w-xs text-[16px] text-ink-secondary">{s.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Bandeau sombre */}
        <section className="relative overflow-hidden bg-night py-24 text-white">
          <div aria-hidden className="absolute -right-40 -top-40 h-[480px] w-[480px] rounded-full bg-accent/25 blur-3xl" />
          <div aria-hidden className="absolute -bottom-48 -left-32 h-[420px] w-[420px] rounded-full bg-accent/15 blur-3xl" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 md:px-6 lg:grid-cols-2">
            <div>
              <p className="text-[13px] font-semibold uppercase tracking-[0.12em] text-[#7cb8ff]">Notre principe</p>
              <h2 className="mt-3 text-[clamp(30px,4vw,46px)] leading-tight tracking-[-0.03em]">Un outil de stratégie, pas de publication automatique.</h2>
              <p className="mt-5 text-[18px] leading-relaxed text-white/70">Markodience structure, vous décidez. Pas de connexion à vos réseaux, pas de publication à votre place : la stratégie, le calendrier et le reporting, point.</p>
              <ul className="mt-8 space-y-3">
                {["Validation horodatée de chaque semaine", "Régénération d’une seule semaine, sans tout refaire", "Rapports PDF prêts à envoyer au client"].map((t) => (
                  <li key={t} className="flex items-start gap-3 text-[17px]"><span className="mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent"><Check size={14} strokeWidth={3} /></span>{t}</li>
                ))}
              </ul>
            </div>
            <div className="mx-auto w-full max-w-md rounded-[28px] border border-white/10 bg-white/[0.06] p-6 backdrop-blur">
              <ILLUSTRATIONS.calendar className="w-full" />
            </div>
          </div>
        </section>

        {/* Tarifs */}
        <section id="tarifs" className="scroll-mt-16 bg-canvas py-24">
          <div className="mx-auto max-w-6xl px-5 md:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow">Tarifs</p>
              <h2 className="mt-3 text-[clamp(30px,4vw,44px)] leading-tight tracking-[-0.03em]">Simple et en francs CFA</h2>
              <p className="mt-4 text-[18px] text-ink-secondary">Commencez gratuitement, passez au palier supérieur quand vous en avez besoin.</p>
            </div>
            <div className="mt-14 grid items-stretch gap-6 md:grid-cols-3">
              {(["gratuit", "pro", "agence"] as const).map((id) => {
                const p = PLANS[id];
                const featured = id === "pro";
                return (
                  <article key={id} className={`relative flex flex-col rounded-[28px] p-8 ${featured ? "bg-night text-white shadow-pop md:-my-4" : "card-flat"}`}>
                    {featured && <span className="absolute -top-3 left-8 rounded-pill bg-accent px-3 py-1 text-[12px] font-semibold text-white">Recommandé</span>}
                    <h3 className="text-[22px]">{p.label}</h3>
                    <p className="mt-4 text-[40px] font-semibold leading-none tracking-[-0.03em]">
                      {id === "gratuit" ? "0" : id === "pro" ? "12 000" : "18 000"}
                      <span className={`ml-1.5 text-[16px] font-normal ${featured ? "text-white/60" : "text-ink-secondary"}`}>XOF{id === "gratuit" ? "" : id === "pro" ? " / mois" : " / siège / mois"}</span>
                    </p>
                    <ul className="mt-7 flex-1 space-y-3">
                      {PLAN_BULLETS[id].map((b) => (
                        <li key={b} className="flex items-start gap-2.5 text-[16px]"><Check size={18} strokeWidth={2.6} className={`mt-0.5 shrink-0 ${featured ? "text-[#7cb8ff]" : "text-accent"}`} />{b}</li>
                      ))}
                    </ul>
                    <Link href={signedIn ? "/dashboard/upgrade" : "/signup"} className={`mt-8 ${featured ? "btn-primary w-full" : "btn-secondary !rounded-pill w-full !py-3 !text-[16px]"}`}>
                      {signedIn ? (id === "gratuit" ? "Mon espace" : `Choisir ${p.label}`) : id === "gratuit" ? "Commencer gratuitement" : `Choisir ${p.label}`}
                    </Link>
                  </article>
                );
              })}
            </div>
            <p className="mt-8 text-center text-[14px] text-ink-secondary">Tarif réduit pour les associations et ONG sur justificatif. Facturation annuelle sur devis pour les structures publiques.</p>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="scroll-mt-16 bg-white py-24">
          <div className="mx-auto max-w-3xl px-5 md:px-6">
            <div className="text-center">
              <p className="eyebrow">FAQ</p>
              <h2 className="mt-3 text-[clamp(30px,4vw,44px)] leading-tight tracking-[-0.03em]">Questions fréquentes</h2>
            </div>
            <div className="mt-12 divide-y divide-[var(--color-border-soft)] rounded-[24px] border border-[var(--color-border-soft)] bg-white shadow-card">
              {FAQ.map((f) => (
                <details key={f.q} className="group px-6 py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[18px] font-medium [&::-webkit-details-marker]:hidden">
                    {f.q}
                    <ChevronDown size={20} className="shrink-0 text-ink-secondary transition group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 text-[16px] leading-relaxed text-ink-secondary">{f.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Appel final */}
        <section className="px-5 pb-24 pt-4 md:px-6">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[36px] bg-gradient-to-br from-accent to-accent-strong px-8 py-16 text-center text-white shadow-glow md:py-20">
            <div aria-hidden className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl" />
            <div aria-hidden className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-2xl" />
            <h2 className="relative mx-auto max-w-2xl text-[clamp(30px,4.4vw,48px)] leading-tight tracking-[-0.03em]">Donnez à vos marques la stratégie qu’elles méritent.</h2>
            <p className="relative mx-auto mt-4 max-w-xl text-[18px] text-white/80">Créez votre espace en deux minutes. Aucune carte bancaire n’est demandée pour démarrer.</p>
            <Link href={startHref} className="relative mt-8 inline-flex items-center gap-2 rounded-pill bg-white px-7 py-3.5 text-[17px] font-semibold text-accent transition hover:-translate-y-px hover:shadow-pop">
              {signedIn ? "Accéder à mon espace" : "Créer mon espace gratuit"} <ArrowRight size={18} />
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--color-border-soft)] bg-white">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-[14px] text-ink-secondary md:flex-row md:px-6">
          <p><span className="font-semibold text-ink">Markodience</span> · La plateforme des community managers</p>
          <nav aria-label="Pied de page" className="flex gap-6">
            {LINKS.map((l) => (<a key={l.href} href={l.href} className="transition hover:text-ink">{l.label}</a>))}
            <Link href={signedIn ? "/dashboard" : "/login"} className="transition hover:text-ink">{signedIn ? "Mon espace" : "Connexion"}</Link>
          </nav>
          <p>© 2026 Markodience</p>
        </div>
      </footer>
    </>
  );
}
