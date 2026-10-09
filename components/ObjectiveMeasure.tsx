"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Gauge, Pencil } from "lucide-react";
import { INDICATOR_MODES, MODE_LABELS, METRIC_INFO, OBJECTIVE_METRICS, buildIndicator, objectiveProgress, type IndicatorMode, type KpiPoint, type Objective, type ObjectiveMetric } from "@/lib/objectives";

const nf = (n: number) => n.toLocaleString("fr-FR");
type Patch = Pick<Objective, "indicator" | "target" | "since">;

/** Mesure d'un objectif : indicateur (prédéfini ou personnalisé), période, cible, et avancement calculé d'après les rapports mensuels. */
export default function ObjectiveMeasure({ objective, reports, onChange }: { objective: Objective; reports: KpiPoint[]; onChange: (patch: Patch) => void }) {
  const ind = objective.indicator;
  const [editing, setEditing] = useState(false);
  const [choice, setChoice] = useState<ObjectiveMetric | "custom">(ind ? (ind.builtin ?? "custom") : "reach");
  const [label, setLabel] = useState(ind && !ind.builtin ? ind.label : "");
  const [unit, setUnit] = useState(ind && !ind.builtin ? ind.unit : "");
  const [mode, setMode] = useState<IndicatorMode>(ind?.mode ?? METRIC_INFO.reach.mode);
  const [target, setTarget] = useState(objective.target ? String(objective.target) : "");
  const [formError, setFormError] = useState<string | null>(null);
  const progress = objectiveProgress(objective, reports);

  function pickChoice(c: ObjectiveMetric | "custom") {
    setChoice(c);
    if (c !== "custom") setMode(METRIC_INFO[c].mode);
  }

  function save() {
    setFormError(null);
    const value = Number(target.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return setFormError("Indiquez une cible : un nombre supérieur à zéro.");
    const built = choice === "custom" ? buildIndicator({ label, unit, mode }) : buildIndicator({ builtin: choice, mode });
    if (!built) return setFormError("Donnez un nom à votre indicateur (par exemple « Contacts WhatsApp »).");
    const sameSeries = ind?.key === built.key && ind.mode === built.mode;
    onChange({ indicator: built, target: Math.round(value), since: sameSeries ? objective.since : undefined });
    setEditing(false);
  }

  return (
    <div className="px-2 pb-1">
      {ind && objective.target && !editing && (
        <div className="mt-1.5">
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[13px]">
            <span className="font-medium text-ink">{ind.label} · {ind.mode === "monthly" ? "par mois" : "cumul"} : cible {nf(objective.target)}{ind.unit ? ` ${ind.unit}` : ""}</span>
            {progress ? <span className="num font-semibold text-ink">{nf(progress.current)} / {nf(progress.target)} · {progress.percent} %{progress.reached && " · atteint"}</span> : <span className="text-ink-secondary">Aucune donnée pour l&apos;instant</span>}
          </div>
          <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-valuenow={progress?.percent ?? 0} aria-valuemin={0} aria-valuemax={100} aria-label={`Avancement de l'objectif : ${progress?.percent ?? 0} %`}>
            <div className={`h-full rounded-full transition-all duration-700 ${progress?.reached ? "bg-success" : "bg-gradient-to-r from-accent to-accent-light"}`} style={{ width: `${progress?.percent ?? 0}%` }} />
          </div>
          <p className="caption mt-1">
            {progress ? progress.basis : <>Saisissez le chiffre « {ind.label} » dans <Link href="/dashboard/kpi" className="text-accent underline">KPIs &amp; Reporting</Link> pour suivre la progression.</>}
          </p>
        </div>
      )}

      {!editing ? (
        <button type="button" className="mt-1 inline-flex items-center gap-1.5 rounded-btn px-1.5 py-1 text-[13px] font-medium text-accent transition hover:bg-accent-soft" onClick={() => setEditing(true)}>
          {ind ? <><Pencil size={13} aria-hidden />Modifier la mesure</> : <><Gauge size={14} aria-hidden />Mesurer cet objectif</>}
        </button>
      ) : (
        <div className="mt-2 rounded-2xl bg-canvas p-3">
          <label className="caption block">Que voulez-vous compter ?
            <select className="input !mt-1 !py-2 !text-[14px]" value={choice} onChange={(e) => pickChoice(e.target.value as ObjectiveMetric | "custom")}>
              {OBJECTIVE_METRICS.map((m) => (<option key={m} value={m}>{METRIC_INFO[m].label}</option>))}
              <option value="custom">Autre : mon propre indicateur…</option>
            </select>
          </label>

          {choice === "custom" && (
            <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
              <label className="caption">Nom de l&apos;indicateur
                <input className="input !mt-1 !py-2 !text-[14px]" maxLength={40} placeholder="Ex. : Contacts WhatsApp" value={label} onChange={(e) => setLabel(e.target.value)} />
              </label>
              <label className="caption">Unité
                <input className="input !mt-1 !py-2 !text-[14px]" maxLength={24} placeholder="Ex. : contacts" value={unit} onChange={(e) => setUnit(e.target.value)} />
              </label>
            </div>
          )}

          <div className="mt-3 grid gap-3 sm:grid-cols-[1.4fr_1fr]">
            <label className="caption">Période
              <select className="input !mt-1 !py-2 !text-[14px]" value={mode} onChange={(e) => setMode(e.target.value as IndicatorMode)}>
                {INDICATOR_MODES.map((m) => (<option key={m} value={m}>{MODE_LABELS[m]}</option>))}
              </select>
            </label>
            <label className="caption">Cible{choice !== "custom" ? ` (${METRIC_INFO[choice].unit})` : unit ? ` (${unit})` : ""}
              <input className="input !mt-1 !py-2 !text-[14px]" inputMode="numeric" placeholder="Ex. : 5000" value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === "Enter" && save()} />
            </label>
          </div>

          <div className="mt-3 rounded-xl bg-white/80 p-3 text-[13px] leading-relaxed text-ink-secondary">
            {choice === "custom" ? (
              <p><span className="font-semibold text-ink">{label.trim() || "Votre indicateur"} :</span> chaque mois, le rapport de <Link href="/dashboard/kpi" className="text-accent underline">KPIs &amp; Reporting</Link> contiendra un champ « {label.trim() || "votre indicateur"} » à remplir, et la barre d&apos;avancement se calculera toute seule. Comptez ce qui est dit dans l&apos;objectif, pas autre chose.</p>
            ) : (
              <>
                <p><span className="font-semibold text-ink">{METRIC_INFO[choice].label} :</span> {METRIC_INFO[choice].help}</p>
                <p className="mt-1.5"><span className="font-semibold text-ink">Exemple :</span> {METRIC_INFO[choice].example}</p>
                <p className="mt-1.5">Ce chiffre se saisit chaque mois dans <Link href="/dashboard/kpi" className="text-accent underline">KPIs &amp; Reporting</Link>.</p>
              </>
            )}
          </div>
          {formError && <p role="alert" className="mt-2 text-[13px] text-danger">{formError}</p>}
          <p className="caption mt-2">Cet objectif ne se compte pas en chiffres (par exemple « publier un bilan chaque trimestre ») ? Cliquez sur « Annuler » : la mesure est facultative.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary !px-4 !py-1.5 !text-[14px]" onClick={save}><Check size={15} />Enregistrer</button>
            <button type="button" className="btn-secondary !px-4 !py-1.5 !text-[14px]" onClick={() => setEditing(false)}>Annuler</button>
            {ind && <button type="button" className="btn-ghost !px-3 !py-1.5 !text-[14px] text-ink-secondary" onClick={() => { onChange({ indicator: undefined, target: undefined, since: undefined }); setEditing(false); }}>Ne plus suivre</button>}
          </div>
        </div>
      )}
    </div>
  );
}
