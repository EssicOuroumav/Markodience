"use client";

import { AlertTriangle, ArrowRight, Check, Loader2, Plus, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { callGenerate } from "@/lib/api";
import { briefProblems, KIND_LABEL, KINDS, type Brief } from "@/lib/plan/brief";
import { MAX_DESCRIPTION, type Extract } from "@/lib/plan/extract";
import { buildSteps } from "@/lib/plan/store";
import { notifyProgress } from "@/lib/progressEvents";
import PageHeader from "./PageHeader";
import PlanReview from "./PlanReview";
import type { ReviewData } from "./PlanReview";

type Form = Omit<Brief, "commitments" | "weeks"> & { commitments: Brief["commitments"]; weeks: number };
type Step = { key: string; stage: string; network?: string; label: string };
type Phase = "intro" | "fiche" | "build" | "done";

const NETWORKS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "WhatsApp", "Site web"];
const BUDGETS: [Brief["resources"]["ad_budget"], string][] = [["aucun", "Aucun budget publicitaire"], ["faible", "Petit budget"], ["moyen", "Budget moyen"], ["eleve", "Budget important"]];
const EXAMPLE = "Exemple : « Notre association aide les orphelins et les veuves à Abidjan en éducation, santé et action sociale. Chaque année, nous lançons « En route pour l'école » avant la rentrée, une campagne de dépistage en octobre, des paniers avant la mi-Ramadan et des habits neufs pour la Tabaski. Nous sommes sur Facebook, Instagram et TikTok, sans budget publicitaire. Un community manager et des bénévoles. Attention aux photos d'enfants et à la neutralité politique. »";

const lines = (s: string) => s.split("\n").map((x) => x.trim()).filter(Boolean);

function Field({ label, hint, gap, children }: { label: string; hint?: string; gap?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="label">{label}{hint && <span className="ml-1 font-normal text-ink-secondary">{hint}</span>}</label>
      {children}
      {gap && <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-warning"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{gap}</p>}
    </div>
  );
}

export default function PlanBuilder({ brandId, brandName, hasContent, savedBrief, draftSteps, review }: {
  brandId: string; brandName: string; hasContent: boolean; savedBrief: Brief | null; draftSteps: string[]; review: ReviewData | null;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>(review ? "done" : "intro");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<Form | null>(savedBrief);
  const [extract, setExtract] = useState<Extract | null>(null);
  const [steps, setSteps] = useState<Step[]>([]);
  const [status, setStatus] = useState<Record<string, "wait" | "run" | "ok" | "error">>({});
  const [stepError, setStepError] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewData | null>(review);

  const problems = useMemo(() => (form ? briefProblems(form) : []), [form]);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const gapFor = (field: string) => extract?.gaps.find((g) => g.field === field)?.question;

  async function analyze() {
    setError(null);
    if (text.trim().length < 40) return setError("Décrivez votre organisation en quelques phrases (40 caractères au moins).");
    setBusy(true);
    const res = await callGenerate({ type: "plan_extract", brand_profile_id: brandId, text: text.trim() });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    const data = res.data as { extract: Extract; brief: Form };
    setExtract(data.extract);
    setForm({ ...data.brief, name: data.brief.name || brandName });
    setPhase("fiche");
  }

  async function runSteps(b: Form, from?: string) {
    setStepError(null);
    const list = buildSteps(b as Brief) as Step[];
    setSteps(list);
    let started = from === undefined;
    for (const s of list) {
      if (!started && s.key !== from) { setStatus((st) => ({ ...st, [s.key]: draftSteps.includes(s.key) || st[s.key] === "ok" ? "ok" : "wait" })); continue; }
      started = true;
      setStatus((st) => ({ ...st, [s.key]: "run" }));
      const res = await callGenerate({ type: "plan_stage", brand_profile_id: brandId, stage: s.stage, ...(s.network ? { network: s.network } : {}) });
      if (!res.ok) {
        setStatus((st) => ({ ...st, [s.key]: "error" }));
        return setStepError(res.error);
      }
      setStatus((st) => ({ ...st, [s.key]: "ok" }));
    }
    notifyProgress();
    router.refresh();
    const { createClient } = await import("@/lib/supabase/client");
    const { data } = await createClient().from("brand_strategy").select("critique, checks, built_at").eq("brand_profile_id", brandId).maybeSingle();
    setResult((data as ReviewData | null) ?? null);
    setPhase("done");
  }

  async function build() {
    if (!form) return;
    setError(null);
    if (problems.length) return setError("Complétez la fiche avant de construire le plan.");
    if (hasContent && !window.confirm("Le plan va remplacer vos piliers et vos lignes éditoriales (et les publications prévues non rédigées). Vos publications rédigées, vos audits et vos rapports sont conservés. Continuer ?")) return;
    setBusy(true);
    const payload = { ...form, audiences: form.audiences.filter((a) => a.name.trim()), networks: form.networks.filter((n) => n.name.trim()), activities: form.activities.filter((a) => a.name.trim()) };
    const res = await callGenerate({ type: "plan_stage", brand_profile_id: brandId, stage: "start", brief: payload });
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setPhase("build");
    setStatus({});
    await runSteps(form);
  }

  if (phase === "done" && result) {
    return (
      <section className="rise">
        <PageHeader tab="plan" />
        <PlanReview data={result} onRestart={() => { setPhase("intro"); setResult(null); }} />
      </section>
    );
  }

  if (phase === "build") {
    const doneCount = steps.filter((s) => status[s.key] === "ok").length;
    return (
      <section className="rise">
        <PageHeader tab="plan" />
        <div className="card-flat">
          <h2 className="section-title">Construction du plan</h2>
          <p className="mt-1 text-[15px] text-ink-secondary">Chaque étape prend de 20 secondes à une minute. Vous pouvez rester sur cette page : si la connexion se coupe, la construction reprend là où elle s&apos;est arrêtée.</p>
          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-canvas"><div className="bar-in h-full rounded-full bg-gradient-to-r from-accent to-accent-light transition-all" style={{ width: `${steps.length ? (doneCount / steps.length) * 100 : 0}%` }} /></div>
          <ol className="mt-5 space-y-2">
            {steps.map((s) => {
              const st = status[s.key] ?? "wait";
              return (
                <li key={s.key} className="flex items-center gap-3 text-[15px]">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full ${st === "ok" ? "bg-success text-white" : st === "error" ? "bg-danger text-white" : st === "run" ? "bg-accent-soft text-accent" : "bg-black/5 text-ink-secondary"}`}>
                    {st === "ok" ? <Check size={14} strokeWidth={3} /> : st === "run" ? <Loader2 size={14} className="animate-spin" /> : st === "error" ? <X size={14} /> : null}
                  </span>
                  <span className={st === "wait" ? "text-ink-secondary" : "font-medium"}>{s.label}</span>
                </li>
              );
            })}
          </ol>
          {stepError && (
            <div role="alert" className="mt-5 rounded-2xl bg-danger/10 px-5 py-4 text-[15px]">
              <p>{stepError}</p>
              <button type="button" className="btn-primary mt-3" onClick={() => form && runSteps(form, steps.find((s) => status[s.key] === "error")?.key)}>Reprendre à cette étape</button>
            </div>
          )}
        </div>
      </section>
    );
  }

  if (phase === "fiche" && form) {
    const budgetLabel = BUDGETS.find(([v]) => v === form.resources.ad_budget)?.[1];
    return (
      <section className="rise">
        <PageHeader tab="plan" />
        <p className="text-[16px] text-ink-secondary">Voici ce que j&apos;ai compris. Corrigez, complétez, puis lancez la construction. Les champs avec ⚠ sont ceux qu&apos;il me manque.</p>
        {extract && extract.assumptions.length > 0 && (
          <div className="card-flat mt-4 border border-accent/20 bg-accent-soft/40">
            <h2 className="text-[16px] font-semibold">Hypothèses à confirmer</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px]">{extract.assumptions.map((a) => <li key={a}>{a}</li>)}</ul>
          </div>
        )}

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <div className="card-flat space-y-4">
            <h2 className="section-title">Votre organisation</h2>
            <Field label="Nom"><input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
            <Field label="Type">
              <select className="input" value={form.kind} onChange={(e) => set("kind", e.target.value as Form["kind"])}>{KINDS.map((k) => <option key={k} value={k}>{KIND_LABEL[k]}</option>)}</select>
            </Field>
            <Field label="Mission" hint="(une ou deux phrases)"><textarea className="input" rows={3} value={form.mission} onChange={(e) => set("mission", e.target.value)} /></Field>
            <Field label="Slogan" hint="(facultatif)" gap={!form.tagline ? gapFor("tagline") : undefined}><input className="input" value={form.tagline} onChange={(e) => set("tagline", e.target.value)} /></Field>
            <Field label="Ce que vous proposez"><textarea className="input" rows={2} value={form.offer} onChange={(e) => set("offer", e.target.value)} /></Field>
          </div>

          <div className="card-flat space-y-4">
            <h2 className="section-title">Vos publics et vos réseaux</h2>
            <Field label="Publics à toucher" gap={gapFor("audiences")}>
              <div className="space-y-2">
                {form.audiences.map((a, i) => (
                  <div key={i} className="flex gap-2">
                    <input aria-label={`Public ${i + 1}`} className="input" placeholder="Qui ?" value={a.name} onChange={(e) => set("audiences", form.audiences.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                    <input aria-label={`Description du public ${i + 1}`} className="input" placeholder="Âge, situation…" value={a.description} onChange={(e) => set("audiences", form.audiences.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))} />
                    <button type="button" className="btn-ghost !px-2" aria-label="Retirer ce public" onClick={() => set("audiences", form.audiences.filter((_, j) => j !== i))}><X size={16} /></button>
                  </div>
                ))}
                {form.audiences.length < 4 && <button type="button" className="btn-ghost !px-3 text-accent" onClick={() => set("audiences", [...form.audiences, { name: "", description: "" }])}><Plus size={16} />Ajouter un public</button>}
              </div>
            </Field>
            <Field label="Réseaux sociaux" gap={gapFor("networks")}>
              <div className="flex flex-wrap gap-2">
                {NETWORKS.map((n) => {
                  const on = form.networks.some((x) => x.name === n);
                  return <button key={n} type="button" aria-pressed={on} onClick={() => set("networks", on ? form.networks.filter((x) => x.name !== n) : [...form.networks, { name: n, audience: "" }])} className={`rounded-pill border px-4 py-1.5 text-[14px] font-medium ${on ? "border-accent bg-accent text-white" : "border-black/10 bg-white"}`}>{n}</button>;
                })}
              </div>
              <div className="mt-3 space-y-2">
                {form.networks.map((n, i) => (
                  <div key={n.name} className="flex items-center gap-2"><span className="w-24 shrink-0 text-[14px] font-medium">{n.name}</span><input aria-label={`Public de ${n.name}`} className="input" placeholder="Public de ce réseau (facultatif)" value={n.audience} onChange={(e) => set("networks", form.networks.map((x, j) => (j === i ? { ...x, audience: e.target.value } : x)))} /></div>
                ))}
              </div>
            </Field>
          </div>

          <div className="card-flat space-y-4 lg:col-span-2">
            <h2 className="section-title">Vos campagnes et temps forts</h2>
            <p className="text-[15px] text-ink-secondary">Ce sont elles qui rythment l&apos;année : avant chaque campagne, le plan prévoit le teasing, puis l&apos;action, puis le bilan.</p>
            {form.activities.map((a, i) => (
              <div key={i} className="grid gap-2 rounded-xl bg-canvas p-3 md:grid-cols-[1.2fr_150px_150px_1.5fr_auto]">
                <input aria-label={`Nom de l'activité ${i + 1}`} className="input" placeholder="Nom" value={a.name} onChange={(e) => set("activities", form.activities.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} />
                <input aria-label={`Début de l'activité ${i + 1}`} type="date" className="input" value={a.start} onChange={(e) => set("activities", form.activities.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                <input aria-label={`Fin de l'activité ${i + 1}`} type="date" className="input" value={a.end} onChange={(e) => set("activities", form.activities.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                <input aria-label={`Objectif de l'activité ${i + 1}`} className="input" placeholder="Objectif" value={a.goal} onChange={(e) => set("activities", form.activities.map((x, j) => (j === i ? { ...x, goal: e.target.value } : x)))} />
                <button type="button" className="btn-ghost !px-2" aria-label="Retirer cette activité" onClick={() => set("activities", form.activities.filter((_, j) => j !== i))}><X size={16} /></button>
              </div>
            ))}
            <button type="button" className="btn-ghost !px-3 text-accent" onClick={() => set("activities", [...form.activities, { name: "", start: "", end: "", goal: "" }])}><Plus size={16} />Ajouter une campagne</button>
            {gapFor("activities") && <p className="flex items-start gap-1.5 text-[13px] text-warning"><AlertTriangle size={14} className="mt-0.5 shrink-0" />{gapFor("activities")}</p>}
            <Field label="Début du plan" hint="(un lundi)"><input type="date" className="input max-w-[200px]" value={form.plan_start} onChange={(e) => set("plan_start", e.target.value)} /></Field>
          </div>

          <div className="card-flat space-y-4">
            <h2 className="section-title">Vos moyens</h2>
            <Field label="Budget publicitaire">
              <select className="input" value={form.resources.ad_budget} onChange={(e) => set("resources", { ...form.resources, ad_budget: e.target.value as Brief["resources"]["ad_budget"] })}>{BUDGETS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
            </Field>
            <Field label="Équipe" gap={!form.resources.team ? gapFor("team") : undefined}><input className="input" placeholder="Ex. : un community manager et des bénévoles" value={form.resources.team} onChange={(e) => set("resources", { ...form.resources, team: e.target.value })} /></Field>
            <Field label="Qui valide les contenus ?" hint="(un par ligne)" gap={form.resources.validators.length === 0 ? gapFor("validators") : undefined}>
              <textarea className="input" rows={2} value={form.resources.validators.join("\n")} onChange={(e) => set("resources", { ...form.resources, validators: lines(e.target.value) })} />
            </Field>
          </div>

          <div className="card-flat space-y-4">
            <h2 className="section-title">Vos limites</h2>
            <Field label="Sujets sensibles" hint="(un par ligne)"><textarea className="input" rows={3} placeholder={"Photos d'enfants\nInformations de santé\nNeutralité politique"} value={form.sensitivities.join("\n")} onChange={(e) => set("sensitivities", lines(e.target.value))} /></Field>
            <Field label="Vos décisions" hint="(un par ligne : cadence, interdits…)"><textarea className="input" rows={2} placeholder="Trois publications par semaine et par réseau" value={form.decisions.join("\n")} onChange={(e) => set("decisions", lines(e.target.value))} /></Field>
            <Field label="À éviter absolument"><input className="input" value={form.avoid} onChange={(e) => set("avoid", e.target.value)} /></Field>
          </div>
        </div>

        {extract && extract.gaps.filter((g) => !["tagline", "audiences", "networks", "activities", "team", "validators"].includes(g.field)).length > 0 && (
          <div className="card-flat mt-6">
            <h2 className="text-[16px] font-semibold">D&apos;autres informations qui amélioreraient le plan</h2>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-[15px] text-ink-secondary">{extract.gaps.filter((g) => !["tagline", "audiences", "networks", "activities", "team", "validators"].includes(g.field)).map((g) => <li key={g.question}>{g.question}</li>)}</ul>
            <p className="caption mt-2">Vous pouvez les ajouter dans les champs ci-dessus (décisions, équipe, sujets sensibles). Sinon, le plan laissera « [X] » à renseigner.</p>
          </div>
        )}

        {problems.length > 0 && (
          <div role="alert" className="mt-6 rounded-2xl bg-warning/15 px-5 py-4 text-[15px]">
            <p className="font-semibold">Avant de construire, il faut :</p>
            <ul className="mt-1 list-disc pl-5">{problems.map((p) => <li key={p}>{p}</li>)}</ul>
          </div>
        )}
        {error && <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-5 py-3.5 text-[15px]">{error}</p>}
        <div className="sticky bottom-4 z-10 mt-8">
          <div className="glass-float flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-6 py-4 shadow-pop">
            <p className="text-[14px] text-ink-secondary">{budgetLabel ? `${budgetLabel}. ` : ""}La construction utilise environ 5 de vos générations du jour.</p>
            <div className="flex gap-3">
              <button type="button" className="btn-secondary" onClick={() => setPhase("intro")}>Modifier ma description</button>
              <button type="button" className="btn-primary" onClick={build} disabled={busy}>{busy ? "Préparation…" : <>Construire mon plan <ArrowRight size={17} /></>}</button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="rise">
      <PageHeader tab="plan" />
      {draftSteps.length > 0 && savedBrief && (
        <div className="card-flat mb-6 border border-accent/20 bg-accent-soft/40">
          <h2 className="text-[18px] font-semibold">Une construction est en cours</h2>
          <p className="mt-1 text-[15px] text-ink-secondary">{draftSteps.length} étape(s) déjà faite(s). Vous pouvez reprendre là où vous vous étiez arrêté.</p>
          <button type="button" className="btn-primary mt-3" onClick={() => { setForm(savedBrief); setPhase("build"); void runSteps(savedBrief, buildSteps(savedBrief).find((s) => !draftSteps.includes(s.key))?.key); }}>Reprendre la construction</button>
        </div>
      )}
      <div className="card-flat">
        <h2 className="section-title">Décrivez votre organisation</h2>
        <p className="mt-1 text-[15px] text-ink-secondary">Parlez comme à un collègue : qui vous êtes, ce que vous faites, vos campagnes de l&apos;année et leurs dates approximatives, vos réseaux, vos moyens, ce qu&apos;il faut protéger. Plus c&apos;est concret, plus le plan l&apos;est. Je lis votre texte, j&apos;en tire une fiche, et vous la corrigez avant toute génération.</p>
        <textarea aria-label="Description de l'organisation" className="input mt-4" rows={12} maxLength={MAX_DESCRIPTION} placeholder={EXAMPLE} value={text} onChange={(e) => setText(e.target.value)} />
        <div className="mt-2 flex items-center justify-between text-[13px] text-ink-secondary"><span>{text.length} / {MAX_DESCRIPTION} caractères</span><span>Aucune information n&apos;est inventée : ce que vous ne dites pas est signalé.</span></div>
        {error && <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-5 py-3.5 text-[15px]">{error}</p>}
        <button type="button" className="btn-primary mt-5" onClick={analyze} disabled={busy}>{busy ? <><Loader2 size={17} className="animate-spin" />Lecture en cours…</> : <><Sparkles size={17} />Analyser ma description</>}</button>
      </div>
    </section>
  );
}
