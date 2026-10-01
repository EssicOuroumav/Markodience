"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { ArrowRight, ChevronDown } from "lucide-react";
import { FAQ } from "@/lib/faq";

/** Questions fréquentes : catégories, accordéon animé (une réponse ouverte à la fois), accessible au clavier. */
export default function FaqSection({ ctaHref, ctaLabel }: { ctaHref: string; ctaLabel: string }) {
  const [cat, setCat] = useState(FAQ[0].id);
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();
  const current = FAQ.find((c) => c.id === cat) ?? FAQ[0];

  function choose(id: string) {
    setCat(id);
    setOpen(0);
  }

  return (
    <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:gap-14">
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div role="tablist" aria-label="Thèmes des questions" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1.5 lg:overflow-visible">
          {FAQ.map((c) => {
            const on = c.id === cat;
            return (
              <button key={c.id} type="button" role="tab" id={`${uid}-tab-${c.id}`} aria-selected={on} aria-controls={`${uid}-panel`} onClick={() => choose(c.id)}
                className={`flex shrink-0 items-center justify-between gap-3 whitespace-nowrap rounded-2xl px-5 py-3 text-left text-[16px] font-medium transition duration-200 lg:whitespace-normal ${on ? "bg-night text-white shadow-card" : "bg-canvas text-ink/80 hover:bg-black/[0.06] hover:text-ink"}`}>
                <span>{c.label}</span>
                <span className={`num hidden rounded-pill px-2 py-0.5 text-[12px] font-semibold lg:inline ${on ? "bg-white/15 text-white" : "bg-white text-ink-secondary"}`}>{c.items.length}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-8 hidden rounded-3xl bg-gradient-to-br from-accent-soft to-white p-6 ring-1 ring-black/5 lg:block">
          <p className="text-[17px] font-semibold tracking-heading">Prêt à essayer ?</p>
          <p className="mt-1 text-[15px] text-ink-secondary">Créez votre espace en deux minutes, sans carte bancaire.</p>
          <Link href={ctaHref} className="btn-primary mt-4 !px-5 !py-2.5 !text-[15px]">{ctaLabel} <ArrowRight size={16} /></Link>
        </div>
      </div>

      <div id={`${uid}-panel`} role="tabpanel" aria-labelledby={`${uid}-tab-${cat}`} className="min-w-0 divide-y divide-[var(--color-border-soft)] overflow-hidden rounded-[28px] border border-[var(--color-border-soft)] bg-white shadow-card">
        {current.items.map((item, i) => {
          const isOpen = open === i;
          return (
            <div key={item.q} className={`transition-colors duration-300 ${isOpen ? "bg-accent-soft/25" : ""}`}>
              <h3>
                <button type="button" aria-expanded={isOpen} aria-controls={`${uid}-a-${cat}-${i}`} id={`${uid}-q-${cat}-${i}`} onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-start gap-4 px-6 py-5 text-left sm:px-8 sm:py-6">
                  <span aria-hidden className={`num mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-[14px] font-semibold transition duration-300 ${isOpen ? "bg-accent text-white shadow-glow" : "bg-canvas text-ink-secondary"}`}>{i + 1}</span>
                  <span className="flex-1 text-[18px] font-semibold leading-snug tracking-[-0.01em]">{item.q}</span>
                  <ChevronDown aria-hidden size={20} className={`mt-1 shrink-0 text-ink-secondary transition duration-300 ${isOpen ? "rotate-180 text-accent" : ""}`} />
                </button>
              </h3>
              <div id={`${uid}-a-${cat}-${i}`} role="region" aria-labelledby={`${uid}-q-${cat}-${i}`} className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                <div className="overflow-hidden">
                  <p className="px-6 pb-6 pl-[4.5rem] pr-6 text-[16.5px] leading-relaxed text-ink-secondary sm:pb-7 sm:pl-[5.5rem] sm:pr-10">{item.a}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
