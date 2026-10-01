import Image from "next/image";
import Link from "next/link";
import { Check } from "lucide-react";
import { IlloCalendar } from "./illustrations";

/** Cadre commun des pages de connexion et d'inscription : formulaire à gauche, panneau visuel à droite. */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[1fr_1.05fr]">
      <main className="flex flex-col px-6 py-8 sm:px-12">
        <Link href="/" className="flex items-center gap-2 self-start text-ink">
          <Image src="/logo-mark.png" alt="" width={30} height={30} priority />
          <span className="text-[18px] font-semibold tracking-heading">Markodience</span>
        </Link>
        <div className="rise d1 mx-auto flex w-full max-w-[440px] flex-1 flex-col justify-center py-10">{children}</div>
      </main>
      <aside aria-hidden className="mesh relative hidden overflow-hidden bg-night lg:flex lg:flex-col lg:justify-center lg:px-16">
        <div className="absolute inset-0 bg-gradient-to-br from-night via-night to-[#0f2a52]" />
        <div className="orb absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent/30 blur-3xl" />
        <div className="orb-slow absolute -bottom-32 -left-24 h-96 w-96 rounded-full bg-[#5aa9ff]/20 blur-3xl" />
        <div className="relative mx-auto max-w-md text-white">
          <div className="pop-in d2 floaty-slow rounded-[28px] border border-white/10 bg-white/[0.06] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.35)] backdrop-blur"><IlloCalendar className="w-full" /></div>
          <h2 className="rise d3 mt-10 text-[32px] leading-tight tracking-[-0.03em]">Une stratégie claire, pour chaque marque.</h2>
          <ul className="mt-6 space-y-3 text-[17px] text-white/80">
            {["Identité, piliers et ligne éditoriale générés pour vous", "Validation, audit et rapports PDF au même endroit", "Aucune connexion à vos réseaux sociaux"].map((t, i) => (
              <li key={t} className={`rise d${i + 4} flex items-start gap-3`}><span className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent"><Check size={12} strokeWidth={3.5} /></span>{t}</li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  );
}
