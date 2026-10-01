"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Plus, Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { BrandProfile } from "@/types";
import BrandLogo, { type Shape } from "./BrandLogo";
import { setActiveBrandCookie } from "./BrandSwitcher";

type Props = { profiles: BrandProfile[]; activeId: string; canAdd: boolean; limitText: string };

function BrandHead({ p, isActive }: { p: BrandProfile; isActive: boolean }) {
  const [shape, setShape] = useState<Shape | null>(null);
  const stacked = shape === "wide";
  return (
    <div className={`flex ${stacked ? "flex-col items-start gap-4" : "items-start gap-4"}`}>
      <BrandLogo src={p.logo_url} name={p.name} color={p.primary_color} size="lg" onShape={setShape} />
      <div className="min-w-0 max-w-full flex-1">
        <h2 className="truncate text-[20px] leading-tight" title={p.name}>{p.name}</h2>
        <p className="caption mt-0.5 truncate">{p.sector ?? "Secteur non renseigné"}</p>
        <div className="mt-2.5 flex flex-wrap gap-2">
          {isActive && <span className="chip"><Check size={13} strokeWidth={3} />Marque active</span>}
          <span className="rounded-pill bg-canvas px-3 py-1 text-[12px] font-medium capitalize text-ink-secondary">{p.status ?? "—"}</span>
        </div>
      </div>
    </div>
  );
}

export default function BrandsList({ profiles, activeId, canAdd, limitText }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function open(id: string) {
    setActiveBrandCookie(id);
    router.push("/dashboard");
    router.refresh();
  }

  async function remove(p: BrandProfile) {
    setError(null);
    if (profiles.length <= 1) return;
    const typed = window.prompt(`Supprimer « ${p.name} » efface définitivement son identité, ses piliers, sa ligne éditoriale, ses audits et ses rapports.\n\nPour confirmer, tapez le nom de la marque :`);
    if (typed === null) return;
    if (typed.trim() !== p.name) return setError("Le nom saisi ne correspond pas : la marque n'a pas été supprimée.");
    setBusy(p.id);
    const { error: err } = await createClient().from("brand_profiles").delete().eq("id", p.id);
    setBusy(null);
    if (err) return setError("La suppression a échoué. Réessayez.");
    if (p.id === activeId) document.cookie = "active_brand=; path=/; max-age=0";
    router.refresh();
  }

  return (
    <div>
      {error && <p role="alert" className="mb-5 rounded-2xl bg-danger/10 px-5 py-3.5 text-[15px]">{error}</p>}
      <ul className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {profiles.map((p) => {
          const isActive = p.id === activeId;
          return (
            <li key={p.id} className={`card group relative flex flex-col overflow-hidden ${busy === p.id ? "opacity-50" : ""}`}>
              <span aria-hidden className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${p.primary_color ?? "var(--color-accent)"}, transparent)` }} />
              <BrandHead p={p} isActive={isActive} />
              <div className="mt-6 flex items-center gap-2.5 border-t hairline pt-4">
                {isActive ? (
                  <Link href="/dashboard" className="btn-secondary flex-1">Vue d&apos;ensemble <ArrowRight size={16} /></Link>
                ) : (
                  <button type="button" className="btn-primary flex-1 !py-2.5 !text-[15px]" onClick={() => open(p.id)}>Ouvrir cette marque <ArrowRight size={16} /></button>
                )}
                <button type="button" className="btn-ghost !px-3 text-ink-secondary hover:text-danger disabled:cursor-not-allowed disabled:opacity-40" disabled={profiles.length <= 1} title={profiles.length <= 1 ? "Au moins une marque est requise" : "Supprimer cette marque"} aria-label={`Supprimer ${p.name}`} onClick={() => remove(p)}>
                  <Trash2 size={17} />
                </button>
              </div>
            </li>
          );
        })}

        <li>
          {canAdd ? (
            <Link href="/dashboard/brands/new" className="group flex h-full min-h-[200px] flex-col items-center justify-center rounded-card border-2 border-dashed border-accent/35 bg-accent-soft/30 p-7 text-center transition duration-300 hover:border-accent hover:bg-accent-soft/60">
              <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-accent shadow-card transition duration-300 group-hover:scale-105"><Plus size={26} strokeWidth={2} /></span>
              <span className="mt-4 text-[18px] font-semibold">Ajouter une marque</span>
              <span className="caption mt-1 max-w-[220px]">Un nouveau client, une nouvelle marque : sans changer de compte.</span>
            </Link>
          ) : (
            <Link href="/dashboard/upgrade?reason=profiles" className="group flex h-full min-h-[200px] flex-col items-center justify-center rounded-card border-2 border-dashed border-black/15 bg-white p-7 text-center transition hover:border-accent/50">
              <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-2xl bg-canvas text-ink-secondary"><Plus size={26} strokeWidth={2} /></span>
              <span className="mt-4 text-[18px] font-semibold">Limite atteinte</span>
              <span className="caption mt-1 max-w-[240px]">{limitText}</span>
              <span className="btn-primary mt-4 !px-5 !py-2 !text-[15px]">Voir les paliers</span>
            </Link>
          )}
        </li>
      </ul>
    </div>
  );
}
