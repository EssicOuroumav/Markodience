"use client";

import { Download, FileText, Sparkles } from "lucide-react";
import { useState } from "react";
import { callGenerate } from "@/lib/api";
import { ASSISTANT_TASKS, MAX_INPUT, TASK_INFO, type AssistantOutput, type AssistantTask } from "@/lib/assistant/schemas";
import { createClient } from "@/lib/supabase/client";
import GenerateError from "./GenerateError";
import PageHeader from "./PageHeader";

type Props = { brandId: string; brandName: string; brandColor: string | null; hasIdentity: boolean; watermark: boolean; footer: string };

export default function AssistantTab({ brandId, brandName, brandColor, hasIdentity, watermark, footer }: Props) {
  const supabase = createClient();
  const [task, setTask] = useState<AssistantTask>("analyse");
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ task: AssistantTask; out: AssistantOutput } | null>(null);
  const [busyPdf, setBusyPdf] = useState(false);
  const info = TASK_INFO[task];

  async function run() {
    setError(null);
    if (info.needsInput && input.trim().length < 3) return setError("Collez d'abord le message à traiter.");
    setLoading(true);
    const res = await callGenerate({ type: "assistant", brand_profile_id: brandId, task, input: info.needsInput ? input.trim() : "" });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setResult({ task, out: res.data as AssistantOutput });
  }

  async function downloadResult() {
    if (!result) return;
    const { buildDocPdf, docFileName } = await import("@/lib/assistantPdf");
    const kind = TASK_INFO[result.task].label;
    buildDocPdf({ brandName, color: brandColor, kind, ...result.out, watermark, footer }).save(docFileName(brandName, kind));
  }

  /** Dossier stratégique : tout ce qui est construit dans les onglets, en un document à remettre. */
  async function downloadDossier() {
    setBusyPdf(true);
    setError(null);
    try {
      const [{ data: id }, { data: personas }, { data: pillars }, { data: defs }] = await Promise.all([
        supabase.from("brand_identity").select("positioning, foundations, marketing_objectives").eq("brand_profile_id", brandId).maybeSingle(),
        supabase.from("personas").select("name, profile, needs, frictions, tone, levers").eq("brand_profile_id", brandId).order("position"),
        supabase.from("content_pillars").select("name, description, pct, objective, subthemes, cta, kpi").eq("brand_profile_id", brandId).order("pct", { ascending: false, nullsFirst: false }),
        supabase.from("kpi_definitions").select("name, unit, baseline, target, alert_threshold, owner, corrective_action").eq("brand_profile_id", brandId).order("position"),
      ]);
      const { parseFoundations } = await import("@/lib/identity");
      const { normalizeObjectives } = await import("@/lib/objectives");
      const f = parseFoundations(id?.foundations);
      const objectives = normalizeObjectives(id?.marketing_objectives).map((o) => o.text);
      const sections: { heading: string; body: string }[] = [];
      if (id?.positioning || f) sections.push({ heading: "Identité", body: [id?.positioning && `Positionnement : ${id.positioning}`, f?.mission && `Mission : ${f.mission}`, f?.vision && `Vision : ${f.vision}`, f?.values?.length && `Valeurs : ${f.values.map((v) => v.name).join(", ")}`].filter(Boolean).join("\n") });
      if (objectives.length) sections.push({ heading: "Objectifs", body: objectives.map((o) => `- ${o}`).join("\n") });
      if (personas?.length) sections.push({ heading: "Cibles", body: personas.map((p) => `${p.name}\n${p.profile}\nBesoins : ${p.needs}\nFreins : ${p.frictions}\nTon : ${p.tone}\nLeviers : ${p.levers}`).join("\n\n") });
      if (pillars?.length) sections.push({ heading: "Piliers de contenu", body: pillars.map((p) => `${p.name}${p.pct != null ? ` (${p.pct} %)` : ""}\n${p.description ?? ""}${p.objective ? `\nObjectif : ${p.objective}` : ""}${p.subthemes?.length ? `\nSous-thèmes : ${p.subthemes.join(", ")}` : ""}${p.cta ? `\nAppel à l'action : ${p.cta}` : ""}`).join("\n\n") });
      if (defs?.length) sections.push({ heading: "Indicateurs de suivi", body: defs.map((d) => `${d.name}${d.unit ? ` (${d.unit})` : ""} : départ ${d.baseline ?? "—"}, objectif ${d.target ?? "—"}, alerte ${d.alert_threshold ?? "—"}${d.owner ? `, responsable ${d.owner}` : ""}${d.corrective_action ? `\nSi dérapage : ${d.corrective_action}` : ""}`).join("\n\n") });
      if (sections.length === 0) { setError("Il n'y a encore rien à exporter : construisez d'abord l'identité ou le plan."); return; }
      const { buildDocPdf, docFileName } = await import("@/lib/assistantPdf");
      buildDocPdf({ brandName, color: brandColor, kind: "Dossier stratégique", title: `Stratégie de communication - ${brandName}`, sections, watermark, footer }).save(docFileName(brandName, "DossierStrategique"));
    } finally {
      setBusyPdf(false);
    }
  }

  return (
    <section className="rise">
      <PageHeader tab="assistant">
        <button type="button" className="btn-secondary" onClick={downloadDossier} disabled={busyPdf}><FileText size={16} />{busyPdf ? "Préparation…" : "Dossier stratégique (PDF)"}</button>
      </PageHeader>

      <div role="radiogroup" aria-label="Que voulez-vous faire ?" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {ASSISTANT_TASKS.map((t) => (
          <button key={t} type="button" role="radio" aria-checked={task === t} onClick={() => { setTask(t); setError(null); }} className={`rounded-2xl border p-4 text-left transition ${task === t ? "border-accent bg-accent-soft" : "border-black/10 bg-white hover:border-black/25"}`}>
            <p className="text-[15px] font-semibold">{TASK_INFO[t].label}</p>
          </button>
        ))}
      </div>

      <div className="card-flat mt-5 space-y-4">
        <p className="text-[15px] text-ink-secondary">{info.hint}</p>
        {info.needsInput && (
          <div><label className="label" htmlFor="as-input">{info.inputLabel}</label><textarea id="as-input" className="input min-h-[110px]" maxLength={MAX_INPUT} value={input} onChange={(e) => setInput(e.target.value)} /></div>
        )}
        {hasIdentity ? (
          <button type="button" className="btn-primary" onClick={run} disabled={loading}><Sparkles size={16} />{loading ? "Réflexion en cours…" : "Lancer"}</button>
        ) : (
          <p className="text-[15px] text-ink-secondary">Définissez d&apos;abord l&apos;identité de la marque : l&apos;assistant s&apos;appuie dessus.</p>
        )}
      </div>
      {error && <GenerateError message={error} onRetry={() => setError(null)} />}

      {result && (
        <article className="card-flat mt-6" aria-live="polite">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div><p className="eyebrow">{TASK_INFO[result.task].label}</p><h2 className="mt-1 text-[24px] leading-tight">{result.out.title}</h2></div>
            <button type="button" className="btn-secondary" onClick={downloadResult}><Download size={16} />Télécharger en PDF</button>
          </div>
          <p className="mt-3 text-[16px] font-medium leading-relaxed">{result.out.summary}</p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            {result.out.sections.map((s, i) => (
              <section key={i} className="rounded-2xl bg-canvas p-4"><h3 className="text-[16px] font-semibold">{s.heading}</h3><p className="mt-1 whitespace-pre-wrap text-[15px] text-ink-secondary">{s.body}</p></section>
            ))}
          </div>
          {result.out.actions.length > 0 && (
            <div className="mt-5"><h3 className="text-[16px] font-semibold">Actions</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-[15px]">{result.out.actions.map((a, i) => <li key={i}>{a}</li>)}</ul></div>
          )}
          <p className="caption mt-4">Proposition de l&apos;IA, à relire : elle s&apos;appuie sur les données saisies dans vos onglets.</p>
        </article>
      )}
    </section>
  );
}
