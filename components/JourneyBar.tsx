"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Check, Flag, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { journeyPosition, type JourneyStep } from "@/lib/journey";

type Props = { steps: JourneyStep[]; brandId: string; dismissed: string[]; lockedCount: number };

/**
 * Guide d'avancement affiché en bas de chaque étape tant que la marque n'est pas terminée : « Étape 2 sur 8 »,
 * bouton vers l'étape suivante (que le contenu ait été généré ou modifié), « Passer » et « Masquer le guide ».
 * La navigation libre par la barre latérale reste possible.
 */
export default function JourneyBar({ steps, brandId, dismissed, lockedCount }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const slug = pathname.startsWith("/dashboard/") ? pathname.split("/")[2] : null;
  const pos = journeyPosition(steps, slug);
  if (!pos) return null;
  const { index, total, current, next, isLast } = pos;

  async function dismiss(goTo?: string) {
    setBusy(true);
    await createClient().auth.updateUser({ data: { journey_dismissed: Array.from(new Set([...dismissed, brandId])) } });
    router.refresh();
    if (goTo) router.push(goTo);
    setBusy(false);
  }

  return (
    <aside aria-label="Guide d'avancement" className="mt-10">
      <div className="glass-float mx-auto max-w-4xl rounded-[22px] border border-black/5 p-4 shadow-pop md:p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-accent">Étape {index + 1} sur {total}</p>
            <ol className="mt-2 hidden items-center gap-1.5 sm:flex" aria-label="Étapes du parcours">
              {steps.map((s, i) => (
                <li key={s.slug} title={s.label} className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold transition ${i === index ? "bg-accent text-white ring-4 ring-accent/20" : s.done ? "bg-success text-white" : "bg-black/[0.07] text-ink-secondary"}`}>
                  {s.done && i !== index ? <Check size={13} strokeWidth={3} aria-label="Terminée" /> : i + 1}
                </li>
              ))}
            </ol>
            <p className="mt-2 text-[15px] text-ink-secondary">
              {current.done ? <>Cette étape est prête. Vous pourrez toujours la modifier ensuite.</> : <>Générez ou complétez cette étape, puis passez à la suivante.</>}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {current.done ? (
              isLast ? (
                <button type="button" className="btn-primary" disabled={busy} onClick={() => dismiss("/dashboard")}><Flag size={17} />Terminer le parcours</button>
              ) : (
                <Link href={`/dashboard/${next!.slug}`} className="btn-primary">Continuer vers {next!.label} <ArrowRight size={18} /></Link>
              )
            ) : isLast ? (
              <button type="button" className="btn-secondary" disabled={busy} onClick={() => dismiss("/dashboard")}>Terminer sans cette étape</button>
            ) : (
              <Link href={`/dashboard/${next!.slug}`} className="btn-secondary">Passer cette étape <ArrowRight size={17} /></Link>
            )}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t hairline pt-3 text-[13px] text-ink-secondary">
          {isLast && current.done && lockedCount > 0 ? (
            <Link href="/dashboard/upgrade" className="inline-flex items-center gap-1.5 hover:text-ink"><Lock size={13} />{lockedCount} autre{lockedCount > 1 ? "s" : ""} étape{lockedCount > 1 ? "s" : ""} dans le palier Pro</Link>
          ) : <span />}
          <button type="button" className="underline-offset-2 hover:text-ink hover:underline" disabled={busy} onClick={() => dismiss()}>Masquer le guide</button>
        </div>
      </div>
    </aside>
  );
}
