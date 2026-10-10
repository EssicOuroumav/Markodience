"use client";

import { Check, ChevronDown, Lightbulb, Plus, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { callGenerate } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { evaluatePillar, VERDICT_LABEL, type ChainRow, type MethodStep } from "@/lib/strategy/evaluate";
import { PRIORITIES, PRIORITY_LABEL, type Diagnostic, type Priority } from "@/lib/strategy/schemas";
import { notifyProgress } from "@/lib/progressEvents";
import EditableText from "./EditableText";
import EmptyState from "./EmptyState";
import GenerateError from "./GenerateError";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

export type Pillar = {
  id: string; name: string | null; description: string | null; examples: string[] | null; pct: number | null; role: string | null;
  objective: string | null; persona_ids: string[] | null; subthemes: string[] | null; cta: string | null; kpi: string | null; rationale: string | null; status: "hypothese" | "valide" | null;
};
const COLUMNS = "id, name, description, examples, pct, role, objective, persona_ids, subthemes, cta, kpi, rationale, status";
const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);
const VERDICT_CLS = { solide: "bg-success/20 text-ink", a_ameliorer: "bg-warning/25 text-ink", a_retravailler: "bg-danger/15 text-danger" } as const;
const SEGMENT = ["bg-accent", "bg-accent-light", "bg-success", "bg-warning", "bg-ink/70", "bg-black/25", "bg-accent/50"];

function Method({ steps }: { steps: MethodStep[] }) {
  return (
    <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6" aria-label="Les 6 étapes de la méthode">
      {steps.map((s) => (
        <li key={s.n}>
          <Link href={s.href} className={`flex h-full flex-col rounded-2xl border p-3.5 transition hover:shadow-card ${s.done ? "border-success/30 bg-success/10" : "border-black/10 bg-white"}`}>
            <span className="flex items-center justify-between"><span className={`num flex h-7 w-7 items-center justify-center rounded-lg text-[13px] font-semibold ${s.done ? "bg-success text-white" : "bg-accent-soft text-accent"}`}>{s.done ? <Check size={14} strokeWidth={3} /> : s.n}</span></span>
            <span className="mt-2 text-[14px] font-semibold leading-snug">{s.title}</span>
            <span className="mt-1 text-[12px] leading-snug text-ink-secondary">{s.detail}</span>
          </Link>
        </li>
      ))}
    </ol>
  );
}

function Chain({ rows }: { rows: ChainRow[] }) {
  return (
    <article className="card-flat overflow-x-auto">
      <h2 className="section-title">De l&apos;objectif au résultat</h2>
      <p className="mt-1 text-[15px] text-ink-secondary">Chaque objectif doit être servi par au moins un pilier, nourri d&apos;idées, transformé en publications et mesuré.</p>
      {rows.length === 0 ? <p className="mt-3 text-[15px] text-ink-secondary">Définissez d&apos;abord vos objectifs dans l&apos;identité de la marque.</p> : (
        <table className="mt-3 w-full min-w-[720px] text-left text-[14px]">
          <thead><tr className="caption"><th className="py-2 pr-3">Objectif</th><th className="py-2 pr-3">Pilier</th><th className="py-2 pr-3">Idées</th><th className="py-2 pr-3">Publications</th><th className="py-2">Résultat mesuré par</th></tr></thead>
          <tbody>
            {rows.map((r) => r.pillars.length === 0 ? (
              <tr key={r.objective} className="border-t hairline"><td className="py-2.5 pr-3 font-medium">{r.objective}</td><td colSpan={4} className="py-2.5 text-warning">Aucun pilier ne sert cet objectif.</td></tr>
            ) : r.pillars.map((p, i) => (
              <tr key={`${r.objective}-${p.name}`} className="border-t hairline align-top">
                <td className="py-2.5 pr-3 font-medium">{i === 0 ? r.objective : ""}</td>
                <td className="py-2.5 pr-3">{p.name}{p.pct != null && <span className="caption"> · {p.pct} %</span>}</td>
                <td className="py-2.5 pr-3">{p.ideas.total ? `${p.ideas.kept} retenue${p.ideas.kept > 1 ? "s" : ""} / ${p.ideas.total}` : <span className="text-ink-secondary">aucune</span>}</td>
                <td className="py-2.5 pr-3">{p.posts.planned + p.posts.published ? `${p.posts.published} publiée${p.posts.published > 1 ? "s" : ""}, ${p.posts.planned} à venir` : <span className="text-ink-secondary">aucune</span>}</td>
                <td className="py-2.5">{p.kpi ?? <span className="text-warning">à définir</span>}</td>
              </tr>
            )))}
          </tbody>
        </table>
      )}
    </article>
  );
}

export default function PillarsTab({ brandId, initial, hasIdentity, objectives, personas, diagnostic: initialDiag, steps, chain, ideaCounts: initialCounts }: {
  brandId: string; initial: Pillar[]; hasIdentity: boolean; objectives: string[]; personas: { id: string; name: string }[]; diagnostic: Diagnostic | null; steps: MethodStep[]; chain: ChainRow[]; ideaCounts: Record<string, { total: number; kept: number }>;
}) {
  const supabase = createClient();
  const [pillars, setPillars] = useState<Pillar[]>(initial);
  const [diagnostic, setDiagnostic] = useState<Diagnostic | null>(initialDiag);
  const [counts, setCounts] = useState(initialCounts);
  const [priority, setPriority] = useState<Priority>(initialDiag?.input?.priority ?? "notoriete");
  const [problem, setProblem] = useState(initialDiag?.input?.problem ?? "");
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const personaIds = useMemo(() => new Set(personas.map((p) => p.id)), [personas]);
  const total = pillars.reduce((n, p) => n + (p.pct ?? 0), 0);

  async function reload() {
    const [{ data }, { data: id }, { data: ideas }] = await Promise.all([
      supabase.from("content_pillars").select(COLUMNS).eq("brand_profile_id", brandId).order("pct", { ascending: false, nullsFirst: false }),
      supabase.from("brand_identity").select("diagnostic").eq("brand_profile_id", brandId).maybeSingle(),
      supabase.from("content_ideas").select("pillar_id, status").eq("brand_profile_id", brandId),
    ]);
    setPillars((data as Pillar[]) ?? []);
    setDiagnostic((id?.diagnostic as Diagnostic | null) ?? null);
    const c: Record<string, { total: number; kept: number }> = {};
    for (const i of ideas ?? []) if (i.pillar_id) { c[i.pillar_id] ??= { total: 0, kept: 0 }; c[i.pillar_id].total++; if (i.status === "retenue" || i.status === "produite") c[i.pillar_id].kept++; }
    setCounts(c);
  }

  async function build() {
    if (pillars.length > 0 && !window.confirm("Refaire l'analyse remplace vos piliers actuels (et détache leurs idées). Continuer ?")) return;
    setLoading("build");
    setError(null);
    const res = await callGenerate({ type: "pillars", brand_profile_id: brandId, brief: { priority, problem: problem.trim() } });
    if (!res.ok) { setLoading(null); return setError(res.error); }
    await reload();
    setLoading(null);
    notifyProgress();
  }

  async function genIdeas(p: Pillar) {
    setLoading(p.id);
    setError(null);
    const res = await callGenerate({ type: "ideas", brand_profile_id: brandId, pillar_id: p.id, count: 6 });
    if (!res.ok) { setLoading(null); return setError(res.error); }
    await reload();
    setLoading(null);
  }

  async function patch(id: string, p: Partial<Pillar>) {
    setPillars((ps) => ps.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("content_pillars").update(p).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function add() {
    setSave("saving");
    const { data, error: err } = await supabase.from("content_pillars").insert({ brand_profile_id: brandId, name: "Nouveau pilier", description: "", examples: [], pct: 0, status: "hypothese" }).select(COLUMNS).single();
    if (err || !data) return setSave("error");
    setPillars((ps) => [...ps, data as Pillar]);
    setSave("saved");
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer ce pilier ? Ses idées restent dans la banque, détachées.")) return;
    setSave("saving");
    const { error: err } = await supabase.from("content_pillars").delete().eq("id", id);
    if (err) return setSave("error");
    setPillars((ps) => ps.filter((p) => p.id !== id));
    setSave("saved");
  }

  if (!hasIdentity) {
    return (
      <section>
        <PageHeader tab="pillars" />
        <EmptyState illustration="pillars" title="Commencez par votre identité de marque" text="Les piliers de contenu s'appuient sur votre positionnement et vos objectifs : définissez d'abord l'identité.">
          <Link href="/dashboard/identity" className="btn-primary">Aller à l&apos;identité de marque</Link>
        </EmptyState>
      </section>
    );
  }

  const briefOpen = pillars.length === 0;
  return (
    <section className="rise space-y-6">
      <PageHeader tab="pillars"><SaveIndicator state={save} /></PageHeader>

      <Method steps={steps} />

      <details className="card-flat" open={briefOpen}>
        <summary className="flex cursor-pointer items-center justify-between gap-3 text-[17px] font-semibold">Brief stratégique <ChevronDown size={18} className="text-ink-secondary" /></summary>
        <p className="mt-2 max-w-3xl text-[15px] text-ink-secondary">On ne commence pas par « qu&apos;allons-nous publier ? », mais par « quel résultat devons-nous obtenir ? ». Indiquez l&apos;objectif prioritaire et le problème actuel : l&apos;IA propose des piliers comme des <strong>hypothèses</strong> que vous validez ensuite.</p>
        <div className="mt-4 grid gap-4 lg:grid-cols-[320px_1fr]">
          <div><label className="label" htmlFor="priority">Objectif prioritaire</label>
            <select id="priority" className="input" value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>{PRIORITIES.map((p) => <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>)}</select></div>
          <div><label className="label" htmlFor="problem">Problème actuel de communication <span className="font-normal text-ink-secondary">(facultatif)</span></label>
            <textarea id="problem" rows={3} className="input" maxLength={800} placeholder="Ex. : beaucoup de vues mais peu de dons ; le public ne comprend pas ce que nous faisons." value={problem} onChange={(e) => setProblem(e.target.value)} /></div>
        </div>
        <button type="button" className="btn-primary mt-4" onClick={build} disabled={loading !== null}><Sparkles size={16} />{loading === "build" ? "Analyse en cours…" : pillars.length ? "Refaire l'analyse et les piliers" : "Analyser mon brief et construire les piliers"}</button>
      </details>
      {error && <GenerateError message={error} onRetry={() => setError(null)} />}

      {diagnostic && (
        <article className="card-flat border border-accent/20 bg-accent-soft/40">
          <h2 className="section-title">Diagnostic</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-3">
            <div><p className="caption font-semibold uppercase">Problème identifié</p><p className="mt-1 text-[15px]">{diagnostic.problem}</p></div>
            <div><p className="caption font-semibold uppercase">Objectif prioritaire</p><p className="mt-1 text-[15px]">{diagnostic.priority_objective}</p></div>
            <div><p className="caption font-semibold uppercase">Hypothèses à vérifier</p><ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">{diagnostic.hypotheses.map((h) => <li key={h}>{h}</li>)}</ul></div>
          </div>
        </article>
      )}

      {pillars.length === 0 ? (
        <EmptyState illustration="pillars" title="Aucun pilier pour l'instant" text="Un pilier est une grande catégorie stratégique durable. Il se décline en sous-thèmes, puis en idées, puis en publications. Remplissez le brief ci-dessus, ou ajoutez vos piliers à la main.">
          <button type="button" className="btn-secondary" onClick={add}><Plus size={16} />Ajouter un pilier</button>
        </EmptyState>
      ) : (
        <>
          <article className="card-flat">
            <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="section-title">Répartition du contenu</h2><span className={`num rounded-pill px-3 py-1 text-[13px] font-semibold ${total === 100 ? "bg-success/20" : "bg-warning/25"}`}>{total} %{total !== 100 && " — le total doit faire 100 %"}</span></div>
            <div className="mt-3 flex h-3 overflow-hidden rounded-full bg-canvas" role="img" aria-label="Répartition des piliers">
              {pillars.map((p, i) => <span key={p.id} className={SEGMENT[i % SEGMENT.length]} style={{ width: `${Math.min(p.pct ?? 0, 100)}%` }} title={`${p.name} ${p.pct ?? 0} %`} />)}
            </div>
          </article>

          <div className="grid gap-5 xl:grid-cols-2">
            {pillars.map((p, i) => {
              const ev = evaluatePillar(p, { objectives, personaIds, ideaCount: counts[p.id]?.total ?? 0 });
              const linked = new Set(p.persona_ids ?? []);
              return (
                <article key={p.id} className="card-flat relative overflow-hidden">
                  <span aria-hidden className={`absolute inset-x-0 top-0 h-1 ${SEGMENT[i % SEGMENT.length]}`} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="num inline-flex h-8 w-8 items-center justify-center rounded-lg bg-accent-soft text-[13px] font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1 text-[13px] text-ink-secondary">Part <input type="number" min={0} max={100} aria-label={`Part de ${p.name}`} className="input !w-[68px] !py-1 text-center" value={p.pct ?? 0} onChange={(e) => setPillars((ps) => ps.map((x) => (x.id === p.id ? { ...x, pct: Number(e.target.value) } : x)))} onBlur={(e) => patch(p.id, { pct: Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))) })} /> %</label>
                      <button type="button" aria-pressed={p.status === "valide"} onClick={() => patch(p.id, { status: p.status === "valide" ? "hypothese" : "valide" })} className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${p.status === "valide" ? "bg-success/20 text-ink" : "bg-black/[0.06] text-ink-secondary"}`}>{p.status === "valide" ? "Validé" : "Hypothèse"}</button>
                    </div>
                  </div>
                  <EditableText label="Nom du pilier" className="mt-2 text-[20px] font-semibold" value={p.name ?? ""} onSave={(v) => patch(p.id, { name: v })} />
                  <EditableText multiline label="Pourquoi ce pilier" className="text-[15px] text-ink-secondary" placeholder="Pourquoi ce pilier ? Lien avec les informations de la marque." value={p.rationale ?? p.description ?? ""} onSave={(v) => patch(p.id, { rationale: v, description: v })} />

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="caption px-2 font-semibold uppercase tracking-[0.08em]" htmlFor={`obj-${p.id}`}>Objectif servi</label>
                      <select id={`obj-${p.id}`} className="input mt-1 !py-1.5 text-[14px]" value={p.objective ?? ""} onChange={(e) => patch(p.id, { objective: e.target.value || null })}>
                        <option value="">Choisir un objectif</option>
                        {objectives.map((o) => <option key={o} value={o}>{o}</option>)}
                        {p.objective && !objectives.includes(p.objective) && <option value={p.objective}>{p.objective}</option>}
                      </select>
                    </div>
                    <div>
                      <p className="caption px-2 font-semibold uppercase tracking-[0.08em]">Cibles servies</p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {personas.length === 0 ? <Link href="/dashboard/personas" className="px-2 text-[13px] text-accent">Décrire vos cibles →</Link> : personas.map((c) => {
                          const on = linked.has(c.id);
                          return <button key={c.id} type="button" aria-pressed={on} onClick={() => patch(p.id, { persona_ids: on ? [...linked].filter((x) => x !== c.id) : [...linked, c.id] })} className={`rounded-pill border px-2.5 py-1 text-[12px] font-medium ${on ? "border-accent bg-accent text-white" : "border-black/10 bg-white text-ink-secondary"}`}>{c.name}</button>;
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid gap-x-5 gap-y-1 sm:grid-cols-2">
                    <div><h3 className="caption px-2 font-semibold uppercase tracking-[0.08em]">Sous-thèmes</h3><EditableText multiline label="Sous-thèmes (un par ligne)" className="text-[15px]" placeholder="Un sous-thème par ligne" value={(p.subthemes ?? []).join("\n")} onSave={(v) => patch(p.id, { subthemes: lines(v) })} /></div>
                    <div><h3 className="caption px-2 font-semibold uppercase tracking-[0.08em]">Formats</h3><EditableText multiline label="Formats (un par ligne)" className="text-[15px]" placeholder="Un format par ligne" value={(p.examples ?? []).join("\n")} onSave={(v) => patch(p.id, { examples: lines(v) })} /></div>
                    <div><h3 className="caption px-2 font-semibold uppercase tracking-[0.08em]">Appel à l&apos;action</h3><EditableText label="Appel à l'action" className="text-[15px]" placeholder="Ex. : Commandez sur WhatsApp" value={p.cta ?? ""} onSave={(v) => patch(p.id, { cta: v })} /></div>
                    <div><h3 className="caption px-2 font-semibold uppercase tracking-[0.08em]">Indicateur de réussite</h3><EditableText label="Indicateur" className="text-[15px]" placeholder="Ex. : clics WhatsApp, commandes" value={p.kpi ?? ""} onSave={(v) => patch(p.id, { kpi: v })} /></div>
                  </div>

                  <div className="mt-4 rounded-2xl bg-canvas p-3">
                    <div className="flex items-center justify-between"><p className="text-[13px] font-semibold">Test des 4 questions</p><span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${VERDICT_CLS[ev.verdict]}`}>{VERDICT_LABEL[ev.verdict]} · {ev.passed}/4</span></div>
                    <ul className="mt-2 space-y-1">
                      {ev.questions.map((q) => (
                        <li key={q.id} className="flex items-start gap-2 text-[13px]"><span className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${q.ok ? "bg-success text-white" : "bg-black/15 text-ink-secondary"}`}>{q.ok ? <Check size={10} strokeWidth={4} /> : <X size={10} strokeWidth={3} />}</span><span><span className="font-medium">{q.label}</span> <span className="text-ink-secondary">{q.detail}</span></span></li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Link href={`/dashboard/ideas?pillar=${p.id}`} className="btn-secondary !py-1.5 text-[14px]"><Lightbulb size={15} />{counts[p.id]?.total ? `${counts[p.id].total} idée${counts[p.id].total > 1 ? "s" : ""}` : "Banque d'idées"}</Link>
                    <button type="button" className="btn-secondary !py-1.5 text-[14px]" onClick={() => genIdeas(p)} disabled={loading !== null}><Sparkles size={15} />{loading === p.id ? "Génération…" : "Générer des idées"}</button>
                    <button type="button" className="btn-ghost ml-auto !px-3 text-[14px] text-ink-secondary hover:text-danger" onClick={() => remove(p.id)}><Trash2 size={15} />Supprimer</button>
                  </div>
                </article>
              );
            })}
          </div>
          <Chain rows={chain} />
          <div className="flex flex-wrap gap-3"><button type="button" className="btn-secondary" onClick={add}><Plus size={16} />Ajouter un pilier</button></div>
        </>
      )}
    </section>
  );
}
