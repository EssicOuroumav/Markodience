"use client";

import { CheckCircle2, CircleAlert, HelpCircle, ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { Check } from "@/lib/plan/quality";
import type { CritiqueStage } from "@/lib/plan/schemas";

export type ReviewData = { critique: CritiqueStage | null; checks: Check[] | null; built_at: string | null };

const LEVEL: Record<string, string> = { eleve: "bg-danger/15 text-danger", modere: "bg-warning/20 text-ink", faible: "bg-success/20 text-ink" };
const LEVEL_LABEL: Record<string, string> = { eleve: "Élevé", modere: "Modéré", faible: "Faible" };

/** Bilan d'un plan construit : ce qui a été mis en place, ce qu'il faut vérifier, les risques et les questions. */
export default function PlanReview({ data, onRestart }: { data: ReviewData; onRestart: () => void }) {
  const c = data.critique;
  const failed = (data.checks ?? []).filter((x) => !x.ok);
  const grave = c?.issues.filter((i) => i.severity === "grave") ?? [];
  const minor = c?.issues.filter((i) => i.severity !== "grave") ?? [];
  return (
    <div className="space-y-6">
      <div className="card-flat flex items-start gap-4 border border-success/30 bg-success/10">
        <CheckCircle2 className="mt-0.5 shrink-0 text-success" size={26} />
        <div>
          <h2 className="section-title">Votre plan est en place</h2>
          <p className="mt-1 text-[15px]">L&apos;identité, les piliers, le calendrier de l&apos;année, la ligne éditoriale de chaque réseau et les publications prévues sont dans vos onglets. Les règles, la stratégie organique et le plan d&apos;indicateurs sont dans leurs pages.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {[["/dashboard/identity", "Identité"], ["/dashboard/pillars", "Piliers"], ["/dashboard/editorial", "Ligne éditoriale"], ["/dashboard/posts", "Publications"]].map(([href, label]) => <Link key={href} href={href} className="btn-secondary !py-1.5">{label}</Link>)}
          </div>
        </div>
      </div>

      {c && (
        <>
          <div className="card-flat">
            <h2 className="section-title">Relecture du plan</h2>
            <p className="mt-2 text-[16px]">{c.verdict}</p>
            {c.strengths.length > 0 && <ul className="mt-3 space-y-1.5">{c.strengths.map((s) => <li key={s} className="flex gap-2 text-[15px]"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" />{s}</li>)}</ul>}
          </div>

          {(grave.length > 0 || failed.length > 0) && (
            <div className="card-flat">
              <h2 className="section-title flex items-center gap-2"><CircleAlert className="text-warning" size={20} />À vérifier en priorité</h2>
              <ul className="mt-3 space-y-3">
                {failed.map((f) => <li key={f.id} className="rounded-xl bg-canvas p-3 text-[15px]"><span className="caption font-semibold uppercase">Contrôle automatique</span><br />{f.detail}</li>)}
                {grave.map((i, k) => <li key={k} className="rounded-xl bg-canvas p-3 text-[15px]"><span className="font-semibold">{i.where}</span><br />{i.problem}<br /><span className="text-ink-secondary">Correction : {i.fix}</span></li>)}
              </ul>
            </div>
          )}

          {c.risks.length > 0 && (
            <div className="card-flat">
              <h2 className="section-title flex items-center gap-2"><ShieldAlert size={20} className="text-accent" />Risques et limites</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-[15px]">
                  <thead><tr className="caption"><th className="py-2 pr-3">Niveau</th><th className="py-2 pr-3">Risque</th><th className="py-2">Parade</th></tr></thead>
                  <tbody>{c.risks.map((r, i) => <tr key={i} className="border-t hairline align-top"><td className="py-2 pr-3"><span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${LEVEL[r.level]}`}>{LEVEL_LABEL[r.level]}</span></td><td className="py-2 pr-3">{r.risk}</td><td className="py-2 text-ink-secondary">{r.mitigation}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {c.questions.length > 0 && (
            <div className="card-flat">
              <h2 className="section-title flex items-center gap-2"><HelpCircle size={20} className="text-accent" />Ce que je ne sais pas encore</h2>
              <p className="mt-1 text-[15px] text-ink-secondary">Vos réponses permettent de remplacer les « [X] » et de calibrer la cadence.</p>
              <ul className="mt-3 space-y-3">{c.questions.map((q, i) => <li key={i} className="text-[15px]"><span className="font-medium">{q.question}</span><br /><span className="text-ink-secondary">{q.why}</span></li>)}</ul>
            </div>
          )}

          {minor.length > 0 && (
            <details className="card-flat">
              <summary className="cursor-pointer text-[15px] font-semibold">{minor.length} améliorations possibles</summary>
              <ul className="mt-3 space-y-2 text-[15px]">{minor.map((i, k) => <li key={k}><span className="font-medium">{i.where}</span> : {i.problem} <span className="text-ink-secondary">→ {i.fix}</span></li>)}</ul>
            </details>
          )}
        </>
      )}
      <button type="button" className="btn-secondary" onClick={onRestart}>Refaire le plan</button>
    </div>
  );
}
