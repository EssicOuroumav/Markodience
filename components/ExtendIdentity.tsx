"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { callGenerate } from "@/lib/api";
import type { IdentityExtendOutput } from "@/lib/identity";
import GenerateError from "./GenerateError";

/** Complète une identité créée avant l'ajout des fondations et de la charte, sans toucher au reste. */
export default function ExtendIdentity({ brandId, onDone, what }: { brandId: string; onDone: (d: IdentityExtendOutput) => void; what: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function run() {
    setLoading(true);
    setError(null);
    const res = await callGenerate({ type: "identity_extend", brand_profile_id: brandId });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    onDone(res.data as IdentityExtendOutput);
  }
  return (
    <div className="card-flat border border-accent/20 bg-accent-soft/40 text-center">
      <span aria-hidden className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-accent shadow-card"><Sparkles size={22} className={loading ? "animate-pulse" : ""} /></span>
      <h2 className="mt-3 text-[20px]">Compléter l&apos;identité de la marque</h2>
      <p className="mx-auto mt-1 max-w-lg text-[15px] text-ink-secondary">{what} Votre positionnement, vos cibles et vos objectifs ne sont pas modifiés.</p>
      {error && <GenerateError message={error} onRetry={run} />}
      <button type="button" className="btn-primary mt-4" onClick={run} disabled={loading}>{loading ? "Génération en cours…" : "Compléter maintenant"}</button>
    </div>
  );
}
