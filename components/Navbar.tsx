import Image from "next/image";
import Link from "next/link";

type NavbarProps = {
  children?: React.ReactNode;
  links?: { href: string; label: string }[];
  /** Destination du logo : /dashboard quand l'utilisateur est connecté. */
  homeHref?: string;
};

/** Navbar glassmorphism clair, fixe en haut. Réutilisée partout (accueil, dashboard). */
export default function Navbar({ children, links, homeHref = "/" }: NavbarProps) {
  return (
    <header className="glass fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-5 md:px-6">
        <Link href={homeHref} className="flex items-center gap-2 text-ink">
          <Image src="/logo.png" alt="" width={28} height={28} priority />
          <span className="text-[17px] font-semibold tracking-heading">Markodience</span>
        </Link>
        {links && (
          <nav aria-label="Sections" className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="rounded-pill px-4 py-1.5 text-[15px] text-ink/80 transition hover:bg-black/5 hover:text-ink">{l.label}</a>
            ))}
          </nav>
        )}
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}
