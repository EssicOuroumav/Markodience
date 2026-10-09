"use client";

import { Building } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AGENCY_NAME_MAX, cleanAgencyName } from "@/lib/whiteLabel";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

/** Marque blanche (palier Agence) : le nom de l'agence remplace « Markodience » au pied des exports PDF. */
export default function AgencyBranding({ initial }: { initial: string }) {
  const [name, setName] = useState(initial);
  const [save, setSave] = useState<SaveState>("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const clean = cleanAgencyName(name);
    setName(clean);
    setSave("saving");
    const { error } = await createClient().auth.updateUser({ data: { agency_name: clean } });
    setSave(error ? "error" : "saved");
  }

  return (
    <section className="card-flat">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Building size={19} strokeWidth={1.8} /></span><h2 className="section-title">Marque blanche</h2></div>
        <SaveIndicator state={save} />
      </div>
      <p className="mt-2 text-[15px] text-ink-secondary">Vos exports PDF (rapports KPI, guides de marque, export multi-clients) portent le nom de votre agence au lieu de « Markodience ».</p>
      <form onSubmit={submit} className="mt-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[240px] flex-1">
          <label className="label" htmlFor="agency">Nom de l&apos;agence</label>
          <input id="agency" className="input" maxLength={AGENCY_NAME_MAX} placeholder="Ex. : Agence Baobab Communication" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn-primary">Enregistrer</button>
      </form>
    </section>
  );
}
