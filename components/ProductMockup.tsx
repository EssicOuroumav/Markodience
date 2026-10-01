import { BarChart3, CalendarDays, Check, Fingerprint, LayoutGrid, ListChecks, MessageCircleHeart, Radio, ScanSearch } from "lucide-react";

const NAV = [Fingerprint, ScanSearch, LayoutGrid, MessageCircleHeart, CalendarDays, BarChart3, ListChecks, Radio];
const WEEKS = [
  { n: 1, theme: "Les coulisses de l'atelier", tag: "Vidéo courte", status: "Terminé", cls: "bg-success/20" },
  { n: 2, theme: "Avant / après client", tag: "Carrousel", status: "En cours", cls: "bg-warning/25" },
  { n: 3, theme: "Conseils d'entretien", tag: "Photo + texte", status: "À venir", cls: "bg-black/8" },
  { n: 4, theme: "Live questions-réponses", tag: "Live", status: "À venir", cls: "bg-black/8" },
];

/** Maquette du produit en HTML/CSS : fenêtre de navigateur avec la ligne éditoriale et deux pastilles flottantes. */
export default function ProductMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[600px]">
      <div aria-hidden className="absolute -inset-6 -z-10 rounded-[40px] bg-gradient-to-br from-accent/20 via-accent/5 to-transparent blur-2xl" />
      <div className="overflow-hidden rounded-[22px] border border-[var(--color-border-soft)] bg-white shadow-pop" role="img" aria-label="Aperçu de la ligne éditoriale dans Markodience">
        <div className="flex items-center gap-1.5 border-b border-[var(--color-border-soft)] bg-canvas px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" /><span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" /><span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="mx-auto rounded-pill bg-white px-12 py-1 text-[11px] text-ink-secondary">markodience.vercel.app</span>
        </div>
        <div className="flex">
          <div className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-[var(--color-border-soft)] bg-white py-4 sm:flex">
            {NAV.map((Icon, i) => (
              <span key={i} className={`flex h-9 w-9 items-center justify-center rounded-xl ${i === 4 ? "bg-accent-soft text-accent" : "text-ink-secondary"}`}><Icon size={17} strokeWidth={1.9} /></span>
            ))}
          </div>
          <div className="min-w-0 flex-1 bg-canvas p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[15px] font-semibold tracking-heading">Ligne éditoriale</p>
                <p className="text-[11px] text-ink-secondary">Facebook · 4 semaines · rotation des piliers</p>
              </div>
              <span className="rounded-pill bg-accent px-3 py-1 text-[11px] font-medium text-white">Générer</span>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {WEEKS.map((w) => (
                <div key={w.n} className="rounded-2xl border border-[var(--color-border-soft)] bg-white p-3.5 shadow-card">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-ink-secondary">Semaine {w.n}</span>
                    <span className={`rounded-pill px-2 py-0.5 text-[10px] font-medium ${w.cls}`}>{w.status}</span>
                  </div>
                  <p className="mt-2 text-[13px] font-semibold leading-snug">{w.theme}</p>
                  <p className="mt-1 text-[11px] text-ink-secondary">{w.tag} · 18h30</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="floaty absolute -right-3 -top-6 flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-white p-3 shadow-pop sm:-right-8">
        <span className="relative flex h-12 w-12 items-center justify-center">
          <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90"><circle cx="18" cy="18" r="15" fill="none" className="stroke-accent-soft" strokeWidth="4" /><circle cx="18" cy="18" r="15" fill="none" className="stroke-accent" strokeWidth="4" strokeLinecap="round" strokeDasharray="81 94" /></svg>
          <span className="absolute text-[13px] font-semibold">86</span>
        </span>
        <span><span className="block text-[13px] font-semibold">Score d&apos;audit</span><span className="block text-[11px] text-ink-secondary">2 priorités à traiter</span></span>
      </div>
      <div className="floaty-slow absolute -bottom-5 -left-3 flex items-center gap-2.5 rounded-2xl border border-[var(--color-border-soft)] bg-white px-4 py-3 shadow-pop sm:-left-8">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-success text-white"><Check size={16} strokeWidth={3} /></span>
        <span><span className="block text-[13px] font-semibold">Semaine 2 validée</span><span className="block text-[11px] text-ink-secondary">par la responsable</span></span>
      </div>
    </div>
  );
}
