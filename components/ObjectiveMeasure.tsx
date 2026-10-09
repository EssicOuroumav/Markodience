"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Gauge, Pencil } from "lucide-react";
import { METRIC_INFO, OBJECTIVE_METRICS, objectiveProgress, type KpiPoint, type Objective, type ObjectiveMetric } from "@/lib/objectives";

const nf = (n: number) => n.toLocaleString("fr-FR");

/** Mesure d'un objectif : indicateur du suivi mensuel + cible, et barre d'avancement calculée d'après les rapports KPI. */
export default function ObjectiveMeasure({ objective, reports, onChange }: { objective: Objective; reports: KpiPoint[]; onChange: (patch: Pick<Objective, "metric" | "target" | "since">) => void }) {
  const [editing, setEditing] = useState(false);
  const [metric, setMetric] = useState<ObjectiveMetric>(objective.metric ?? "reach");
  const [target, setTarget] = useState(objective.target ? String(objective.target) : "");
  const progress = objectiveProgress(objective, reports);
  const info = objective.metric ? METRIC_INFO[objective.metric] : null;

  function save() {
    const value = Number(target.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return;
    onChange({ metric, target: Math.round(value), since: metric === objective.metric ? objective.since : undefined });
    setEditing(false);
  }

  return (
    <div className="px-2 pb-1">
      {info && objective.target && !editing && (
        <div className="mt-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[13px]">
            <span className="font-medium text-ink">{info.label} : cible {nf(objective.target)} {info.unit}</span>
            {progress ? <span className="num font-semibold text-ink">{nf(progress.current)} / {nf(progress.target)} · {progress.percent} %{progress.reached && " · atteint"}</span> : <span className="text-ink-secondary">Aucune donnée pour l&apos;instant</span>}
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-valuenow={progress?.percent ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Avancement de l'objectif : ${progress?.percent ?? 0} %`}>
            <div className={`h-full rounded-full transition-all duration-700 ${progress?.reached ? "bg-success" : "bg-gradient-to-r from-accent to-accent-light"}`} style={{ width: `${progress?.percent ?? 0}%` }} />
          </div>
          <p className="caption mt-1">
            {progress ? progress.basis : <>Saisissez un rapport dans <Link href="/dashboard/kpi" className="text-accent underline">KPIs &amp; Reporting</Link> pour suivre la progression.</>}
          </p>
        </div>
      )}

      {!editing ? (
        <button type="button" className="mt-1 inline-flex items-center gap-1.5 rounded-btn px-1.5 py-1 text-[13px] font-medium text-accent transition hover:bg-accent-soft" onClick={() => setEditing(true)}>
          {info ? <><Pencil size={13} aria-hidden />Modifier la mesure</> : <><Gauge size={14} aria-hidden />Mesurer cet objectif</>}
        </button>
      ) : (
        <div className="mt-2 rounded-2xl bg-canvas p-3">
          <div className="grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <label className="caption">Indicateur suivi
              <select className="input !mt-1 !py-2 !text-[14px]" value={metric} onChange={(e) => setMetric(e.target.value as ObjectiveMetric)}>
                {OBJECTIVE_METRICS.map((m) => (<option key={m} value={m}>{METRIC_INFO[m].label}</option>))}
              </select>
            </label>
            <label className="caption">Cible ({METRIC_INFO[metric].unit})
              <input className="input !mt-1 !py-2 !text-[14px]" inputMode="numeric" placeholder="Ex. : 5000" value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
            </label>
          </div>
          <div className="mt-3 rounded-xl bg-white/80 p-3 text-[13px] leading-relaxed text-ink-secondary">
            <p><span className="font-semibold text-ink">{METRIC_INFO[metric].label} :</span> {METRIC_INFO[metric].help}</p>
            <p className="mt-1.5"><span className="font-semibold text-ink">Exemple :</span> {METRIC_INFO[metric].example}</p>
            <p className="mt-1.5">{METRIC_INFO[metric].mode === "cumulative" ? "Les rapports mensuels sont additionnés pour calculer l'avancement." : "L'avancement compare le dernier rapport mensuel à la cible."} Ce chiffre se saisit chaque mois dans <Link href="/dashboard/kpi" className="text-accent underline">KPIs &amp; Reporting</Link>.</p>
          </div>
          <p className="caption mt-2">Cet objectif ne se compte pas en chiffres (par exemple « publier un bilan chaque trimestre » ) ? Cliquez sur « Annuler » : la mesure est facultative.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary !px-4 !py-1.5 !text-[14px]" onClick={save}><Check size={15} />Enregistrer</button>
            <button type="button" className="btn-secondary !px-4 !py-1.5 !text-[14px]" onClick={() => setEditing(false)}>Annuler</button>
            {info && <button type="button" className="btn-ghost !px-3 !py-1.5 !text-[14px] text-ink-secondary" onClick={() => { onChange({ metric: null, target: null, since: undefined }); setEditing(false); }}>Ne plus suivre</button>}
          </div>
        </div>
      )}
    </div>
  );
}
