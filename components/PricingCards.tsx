"use client";

import { useState } from "react";
import { PLANS, MAX_SEATS, formatXof, priceFor, type PlanId } from "@/lib/plans";

const BULLETS: Record<PlanId, string[]> = {
  gratuit: ["1 profil de marque", "Identité, piliers, tonalité", "Exports avec filigrane"],
  pro: ["Jusqu'à 3 profils de marque", "Audit, ligne éditoriale, KPIs, règles, Guide Lives", "Exports sans filigrane"],
  agence: ["Profils illimités", "Tout le palier Pro", "Marque blanche et export multi-clients", "Facturé par siège (2 minimum)"],
};

export default function PricingCards({ currentPlan }: { currentPlan: PlanId }) {
  const [seats, setSeats] = useState(PLANS.agence.minSeats ?? 2);
  const [busy, setBusy] = useState<PlanId | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(plan: "pro" | "agence") {
    setError(null);
    setBusy(plan);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, seats: plan === "agence" ? seats : 1 }),
      });
      const json = await res.json().catch(() => null);
      if (res.ok && json?.url) {
        window.location.assign(json.url);
        return;
      }
      setError(json?.error ?? "Le paiement n'a pas pu démarrer. Réessayez.");
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    }
    setBusy(null);
  }

  const minSeats = PLANS.agence.minSeats ?? 2;
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        {(["gratuit", "pro", "agence"] as const).map((id) => {
          const p = PLANS[id];
          const current = id === currentPlan;
          return (
            <article key={id} className={`card flex flex-col ${current ? "ring-2 ring-accent" : ""}`}>
              <h2 className="text-[22px]">{p.label}</h2>
              <p className="mt-2 text-[28px] font-semibold tracking-heading">
                {id === "gratuit" && "0 XOF"}
                {id === "pro" && formatXof(priceFor("pro"))}
                {id === "agence" && formatXof(priceFor("agence", seats))}
                {id !== "gratuit" && <span className="text-[15px] font-normal text-ink-secondary"> / mois</span>}
              </p>
              {id === "agence" && (
                <div className="mt-2 flex items-center gap-2">
                  <label htmlFor="seats" className="caption">Sièges</label>
                  <button type="button" className="btn-secondary !px-3 !py-1" aria-label="Moins de sièges" onClick={() => setSeats((s) => Math.max(minSeats, s - 1))}>−</button>
                  <input id="seats" type="number" min={minSeats} max={MAX_SEATS} className="input !w-20 !py-1.5 text-center" value={seats}
                    onChange={(e) => setSeats(Math.min(MAX_SEATS, Math.max(minSeats, Math.floor(Number(e.target.value)) || minSeats)))} />
                  <button type="button" className="btn-secondary !px-3 !py-1" aria-label="Plus de sièges" onClick={() => setSeats((s) => Math.min(MAX_SEATS, s + 1))}>+</button>
                </div>
              )}
              {id === "agence" && <p className="caption mt-1">{seats} × {formatXof(PLANS.agence.pricePerSeat ?? 0)}</p>}
              <ul className="mt-4 flex-1 list-disc space-y-1 pl-5 text-[15px]">
                {BULLETS[id].map((b) => (<li key={b}>{b}</li>))}
              </ul>
              {current ? (
                <p className="mt-6 text-center text-[15px] font-medium text-accent">Votre palier actuel</p>
              ) : id === "gratuit" ? null : (
                <button type="button" className="btn-primary mt-6" disabled={busy !== null} onClick={() => choose(id)}>
                  {busy === id ? "Redirection…" : "Choisir ce palier"}
                </button>
              )}
            </article>
          );
        })}
      </div>
      {error && <p role="alert" className="mt-4 text-[15px] text-danger">{error}</p>}
      <p className="caption mt-6">Paiement sécurisé par mobile money ou carte via PayDunya. Abonnement d&apos;un mois, sans renouvellement automatique.</p>
    </div>
  );
}
