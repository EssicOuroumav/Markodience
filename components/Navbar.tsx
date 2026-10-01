import Image from "next/image";
import Link from "next/link";

type NavbarProps = {
  children?: React.ReactNode;
};

/** Navbar glassmorphism clair, fixe en haut. Réutilisée partout (onboarding, dashboard). */
export default function Navbar({ children }: NavbarProps) {
  return (
    <header className="glass fixed inset-x-0 top-0 z-50">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <Image
            src="/logo.png"
            alt="Markodience"
            width={28}
            height={28}
            priority
          />
          <span className="text-[17px] font-semibold tracking-heading">
            Markodience
          </span>
        </Link>
        <div className="flex items-center gap-3">{children}</div>
      </div>
    </header>
  );
}
