import Link from "next/link";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/site";

const LEGAL_LINKS = [
  { href: "/cgu", label: "Conditions d’utilisation" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/mentions-legales", label: "Mentions légales" },
];

/** Pied de page commun (accueil et pages légales). */
export default function SiteFooter({ signedIn = false }: { signedIn?: boolean }) {
  return (
    <footer className="border-t border-[var(--color-border-soft)] bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-10 text-[14px] text-ink-secondary md:flex-row md:items-center md:justify-between md:px-6">
        <p><span className="font-semibold text-ink">{SITE_NAME}</span> · {SITE_TAGLINE}</p>
        <nav aria-label="Informations légales" className="flex flex-wrap gap-x-6 gap-y-2">
          {LEGAL_LINKS.map((l) => (<Link key={l.href} href={l.href} className="transition hover:text-ink">{l.label}</Link>))}
          <Link href={signedIn ? "/dashboard" : "/login"} className="transition hover:text-ink">{signedIn ? "Mon espace" : "Connexion"}</Link>
        </nav>
        <p>© 2026 {SITE_NAME}</p>
      </div>
    </footer>
  );
}
