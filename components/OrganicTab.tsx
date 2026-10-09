"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { OrganicStage } from "@/lib/plan/schemas";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

/** Stratégie organique : des leviers sans budget publicitaire, chacun avec une action à cocher une fois faite. */
export default function OrganicTab({ brandId, levers, initialDone }: { brandId: string; levers: OrganicStage["levers"]; initialDone: number[] }) {
  const [done, setDone] = useState<number[]>(initialDone);
  const [save, setSave] = useState<SaveState>("idle");

  async function toggle(i: number) {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i].sort((a, b) => a - b);
    setDone(next);
    setSave("saving");
    const { error } = await createClient().from("brand_strategy").update({ organic_done: next }).eq("brand_profile_id", brandId);
    setSave(error ? "error" : "saved");
  }

  return (
    <section className="rise">
      <PageHeader tab="organic"><SaveIndicator state={save} /></PageHeader>
      <p className="mb-6 text-[15px] text-ink-secondary">{done.length} action{done.length > 1 ? "s" : ""} sur {levers.length} faite{done.length > 1 ? "s" : ""}. Cochez une action quand elle est réalisée.</p>
      <ol className="grid gap-4 lg:grid-cols-2">
        {levers.map((l, i) => {
          const ok = done.includes(i);
          return (
            <li key={l.title} className={`card-flat transition ${ok ? "opacity-70" : ""}`}>
              <div className="flex items-start gap-3">
                <span className="num flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-[14px] font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-[18px] font-semibold leading-tight">{l.title}</h2>
                  <p className="mt-1 text-[15px] text-ink-secondary">{l.why}</p>
                  <button type="button" aria-pressed={ok} onClick={() => toggle(i)} className={`mt-3 flex w-full items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-left text-[15px] transition ${ok ? "border-success/40 bg-success/10" : "border-black/10 bg-canvas hover:border-black/25"}`}>
                    <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${ok ? "border-success bg-success text-white" : "border-black/25 bg-white"}`}>{ok && <Check size={13} strokeWidth={3.5} />}</span>
                    <span><span className="caption block font-semibold uppercase">Action</span><span className={ok ? "line-through" : "font-medium"}>{l.action}</span></span>
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
