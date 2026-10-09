"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, Gauge, Pencil } from "lucide-react";
import { monthStart } from "@/lib/kpi";
import { CHECK_FREQUENCIES, FREQUENCY_LABELS, INDICATOR_MODES, MODE_LABELS, METRIC_INFO, OBJECTIVE_METRICS, buildIndicator, checklistProgress, objectiveProgress, periodLabel, toggleDone, type CheckFrequency, type IndicatorMode, type KpiPoint, type Objective, type ObjectiveMetric } from "@/lib/objectives";

const nf = (n: number) => n.toLocaleString("fr-FR");
type Patch = Pick<Objective, "indicator" | "target" | "since" | "check">;
const PERIOD_WORD: Record<CheckFrequency, string> = { monthly: "mois", quarterly: "trimestre" };

/** Mesure d'un objectif : indicateur (prédéfini ou personnalisé), période, cible, et avancement calculé d'après les rapports mensuels. */
export default function ObjectiveMeasure({ objective, reports, onChange }: { objective: Objective; reports: KpiPoint[]; onChange: (patch: Patch) => void }) {
  const ind = objective.indicator;
  const check = objective.check;
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<"measured" | "check">(check ? "check" : "measured");
  const [frequency, setFrequency] = useState<CheckFrequency>(check?.frequency ?? "quarterly");
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

  function saveCheck() {
    const same = check?.frequency === frequency;
    onChange({ indicator: undefined, target: undefined, since: undefined, check: { frequency, since: same ? check!.since : monthStart(new Date()), done: same ? check!.done : [] } });
    setEditing(false);
  }

  function save() {
    if (kind === "check") return saveCheck();
    setFormError(null);
    const value = Number(target.replace(/\s/g, "").replace(",", "."));
    if (!Number.isFinite(value) || value <= 0) return setFormError("Indiquez une cible : un nombre supérieur à zéro.");
    const built = choice === "custom" ? buildIndicator({ label, unit, mode }) : buildIndicator({ builtin: choice, mode });
    if (!built) return setFormError("Donnez un nom à votre indicateur (par exemple « Contacts WhatsApp »).");
    const sameSeries = ind?.key === built.key && ind.mode === built.mode;
    onChange({ indicator: built, target: Math.round(value), since: sameSeries ? objective.since : undefined, check: undefined });
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

      {check && !editing && <ChecklistView check={check} onToggle={(key) => onChange({ indicator: undefined, target: undefined, since: undefined, check: toggleDone(check, key) })} />}

      {!editing ? (
        <button type="button" className="mt-1 inline-flex items-center gap-1.5 rounded-btn px-1.5 py-1 text-[13px] font-medium text-accent transition hover:bg-accent-soft" onClick={() => setEditing(true)}>
          {ind ? <><Pencil size={13} aria-hidden />Modifier la mesure</> : check ? <><Pencil size={13} aria-hidden />Modifier le suivi</> : <><Gauge size={14} aria-hidden />Suivre cet objectif</>}
        </button>
      ) : (
        <div className="mt-2 rounded-2xl bg-canvas p-3">
          <div role="radiogroup" aria-label="Type de suivi" className="grid gap-2 sm:grid-cols-2">
            {([["measured", "Un chiffre à suivre", "Ex. : 100 contacts WhatsApp par mois"], ["check", "Un engagement à cocher", "Ex. : publier un bilan chaque trimestre"]] as const).map(([k, title, hint]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => setKind(k)} className={`rounded-xl border px-3 py-2 text-left transition ${kind === k ? "border-accent bg-white shadow-card" : "border-black/10 bg-white/60 hover:border-accent/40"}`}>
                <span className="block text-[14px] font-semibold">{title}</span>
                <span className="block text-[12px] text-ink-secondary">{hint}</span>
              </button>
            ))}
          </div>

          {kind === "check" ? (
            <div className="mt-3">
              <label className="caption block">À quelle fréquence ?
                <select className="input !mt-1 !py-2 !text-[14px]" value={frequency} onChange={(e) => setFrequency(e.target.value as CheckFrequency)}>
                  {CHECK_FREQUENCIES.map((f) => (<option key={f} value={f}>{FREQUENCY_LABELS[f]}</option>))}
                </select>
              </label>
              <p className="mt-3 rounded-xl bg-white/80 p-3 text-[13px] leading-relaxed text-ink-secondary">Aucun chiffre à saisir : à chaque {PERIOD_WORD[frequency]}, vous cochez « fait » quand l&apos;engagement a été tenu. Le site compte les périodes tenues depuis aujourd&apos;hui.</p>
            </div>
          ) : (<>
          <label className="mt-3 caption block">Que voulez-vous compter ?
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
          <p className="caption mt-2">Pas de chiffre à suivre ni d&apos;engagement régulier ? Cliquez sur « Annuler » : le suivi est facultatif.</p>
          </>)}
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" className="btn-primary !px-4 !py-1.5 !text-[14px]" onClick={save}><Check size={15} />Enregistrer</button>
            <button type="button" className="btn-secondary !px-4 !py-1.5 !text-[14px]" onClick={() => setEditing(false)}>Annuler</button>
            {(ind || check) && <button type="button" className="btn-ghost !px-3 !py-1.5 !text-[14px] text-ink-secondary" onClick={() => { onChange({ indicator: undefined, target: undefined, since: undefined, check: undefined }); setEditing(false); }}>Ne plus suivre</button>}
          </div>
        </div>
      )}
    </div>
  );
}

/** Objectif à cocher : une pastille par période écoulée (mois ou trimestre), à cocher quand l'engagement a été tenu. */
function ChecklistView({ check, onToggle }: { check: NonNullable<Objective["check"]>; onToggle: (key: string) => void }) {
  const [now] = useState(() => new Date());
  const p = checklistProgress(check, now);
  const word = PERIOD_WORD[check.frequency];
  return (
    <div className="mt-1.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 text-[13px]">
        <span className="font-medium text-ink">À cocher · {FREQUENCY_LABELS[check.frequency].toLowerCase()}</span>
        <span className="num font-semibold text-ink">{p.done} / {p.total} {p.total > 1 ? "périodes tenues" : "période tenue"}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-valuenow={p.percent} aria-valuemin={0} aria-valuemax={100} aria-label={`Périodes tenues : ${p.percent} %`}>
        <div className="h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all duration-700" style={{ width: `${p.percent}%` }} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Périodes à cocher">
        {p.periods.slice(-8).map((key) => {
          const done = check.done.includes(key);
          const current = key === p.currentKey;
          return (
            <button key={key} type="button" aria-pressed={done} onClick={() => onToggle(key)} title={done ? `Décocher ${periodLabel(key)}` : `Cocher ${periodLabel(key)}`}
              className={`inline-flex items-center gap-1 rounded-pill border px-3 py-1 text-[13px] font-medium transition ${done ? "border-success bg-success text-white" : current ? "border-accent bg-white text-accent ring-2 ring-accent/20" : "border-black/10 bg-white hover:border-accent/50"}`}>
              {done && <Check size={13} strokeWidth={3} aria-hidden />}{periodLabel(key)}{current && !done ? " · en cours" : ""}
            </button>
          );
        })}
      </div>
      <p className="caption mt-1">Cochez chaque {word} où l&apos;engagement a été tenu. Suivi depuis {periodLabel(p.periods[0])}.</p>
    </div>
  );
}
