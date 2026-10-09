"use client";

import { Archive } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { monthLabel, recentMonths } from "@/lib/kpi";
import { buildClientsZip } from "@/lib/multiExport";

type Brand = { id: string; name: string; primary_color: string | null };

/** Palier Agence : archive de tous les clients (guide de marque + rapport KPI du mois + synthèse). */
export default function MultiExport({ brands, footer }: { brands: Brand[]; footer: string }) {
  const months = recentMonths(new Date(), 12);
  const [month, setMonth] = useState(months[1] ?? months[0]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const blob = await buildClientsZip(createClient(), brands, month, footer);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Clients_${month.slice(0, 7)}.zip`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch {
      setError("L'export n'a pas pu être préparé. Réessayez.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-flat flex flex-wrap items-end gap-4">
      <div className="min-w-[240px] flex-1">
        <h2 className="section-title">Export multi-clients</h2>
        <p className="mt-1 text-[15px] text-ink-secondary">Une archive avec, pour chaque marque, son guide de marque et son rapport KPI du mois choisi, plus un tableau de synthèse.{footer ? "" : " Ajoutez le nom de votre agence dans Mon compte pour le faire figurer au pied des documents."}</p>
      </div>
      <div>
        <label className="label" htmlFor="exp-month">Mois du rapport</label>
        <select id="exp-month" className="input" value={month} onChange={(e) => setMonth(e.target.value)}>
          {months.map((m) => (<option key={m} value={m}>{monthLabel(m)}</option>))}
        </select>
      </div>
      <button type="button" className="btn-primary" onClick={run} disabled={busy}><Archive size={17} />{busy ? "Préparation…" : `Exporter ${brands.length} marque${brands.length > 1 ? "s" : ""}`}</button>
      {error && <p role="alert" className="w-full rounded-2xl bg-danger/10 px-5 py-3 text-[15px]">{error}</p>}
    </div>
  );
}
