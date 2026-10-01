"use client";

import { Building2, Check, Heart, Megaphone, Palette, Plus, ShieldCheck, Sparkles, Target, Users, X } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callGenerate } from "@/lib/api";
import { CHANNELS, GOALS, type Questionnaire } from "@/lib/ai/schemas";
import EditableText from "./EditableText";
import GenerateError from "./GenerateError";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PageHeader from "./PageHeader";

type Segment = { name: string; description: string; need: string };
type Color = { color: string; usage: string };
export type Identity = {
  positioning: string | null;
  target_segments: Segment[] | null;
  visual_palette: Color[] | null;
  marketing_objectives: string[] | null;
  questionnaire: Questionnaire | null;
};

const GOAL_LABELS: Record<(typeof GOALS)[number], string> = {
  notoriete: "Notoriété",
  conversion: "Conversion",
  fidelisation: "Fidélisation",
  recrutement: "Recrutement",
};

function Group({ n, Icon, title, hint, children }: { n: number; Icon: typeof Building2; title: string; hint: string; children: React.ReactNode }) {
  return (
    <fieldset className="card-flat overflow-hidden !p-0">
      <legend className="sr-only">{title}</legend>
      <div className="flex items-center gap-4 border-b hairline bg-gradient-to-r from-accent-soft/70 to-white px-7 py-5">
        <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-accent shadow-card"><Icon size={21} strokeWidth={1.8} /></span>
        <div><p className="caption font-semibold uppercase tracking-[0.1em]">Étape {n} sur 4</p><h2 className="text-[20px] leading-tight">{title}</h2></div>
        <p className="ml-auto hidden max-w-[240px] text-right text-[13px] text-ink-secondary lg:block">{hint}</p>
      </div>
      <div className="space-y-6 p-7">{children}</div>
    </fieldset>
  );
}

export default function IdentityTab({
  brandId,
  brandName,
  sector,
  initial,
}: {
  brandId: string;
  brandName: string;
  sector: string;
  initial: Identity | null;
}) {
  const supabase = createClient();
  const [identity, setIdentity] = useState<Identity | null>(initial?.positioning ? initial : null);
  const [save, setSave] = useState<SaveState>("idle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Questionnaire
  const prev = initial?.questionnaire;
  const [q, setQ] = useState({
    brand_name: prev?.brand_name ?? brandName,
    sector: prev?.sector ?? sector,
    offer: prev?.offer ?? "",
    segments: prev?.segments ?? [""],
    problem: prev?.problem ?? "",
    differentiation: prev?.differentiation ?? "",
    personality: prev?.personality ?? ["", "", ""],
    goal: (prev?.goal ?? "notoriete") as Questionnaire["goal"],
    channels: prev?.channels ?? [] as string[],
    avoid: prev?.avoid ?? "",
  });
  const [custom, setCustom] = useState(false);

  async function generate() {
    setFormError(null);
    setError(null);
    const payload = {
      ...q,
      segments: q.segments.map((s) => s.trim()).filter(Boolean),
      personality: q.personality.map((s) => s.trim()),
      avoid: q.avoid.trim(),
    };
    if (!payload.offer.trim() || !payload.problem.trim() || !payload.differentiation.trim() || payload.segments.length === 0) {
      setFormError("Complétez les questions 3 à 6 (au moins un segment de clientèle).");
      return;
    }
    if (payload.personality.some((w) => !w)) {
      setFormError("Indiquez trois mots décrivant la personnalité de la marque.");
      return;
    }
    if (payload.channels.length === 0) {
      setFormError("Choisissez au moins un canal.");
      return;
    }
    setLoading(true);
    const res = await callGenerate({ type: "identity", brand_profile_id: brandId, questionnaire: payload });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setIdentity({ ...(res.data as Omit<Identity, "questionnaire">), questionnaire: payload as Questionnaire });
  }

  async function persist(patch: Partial<Identity>) {
    const next = { ...(identity as Identity), ...patch };
    setIdentity(next);
    setSave("saving");
    const { error: err } = await supabase
      .from("brand_identity")
      .update(patch)
      .eq("brand_profile_id", brandId);
    setSave(err ? "error" : "saved");
  }

  if (!identity) {
    const set = <K extends keyof typeof q>(k: K, v: (typeof q)[K]) => setQ((s) => ({ ...s, [k]: v }));
    if (loading) {
      return (
        <section>
          <PageHeader tab="identity" />
          <div className="card-flat relative overflow-hidden !p-10 text-center" role="status" aria-live="polite">
            <div aria-hidden className="mesh absolute inset-0 opacity-80" />
            <div className="relative">
              <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-accent shadow-card"><Sparkles size={30} strokeWidth={1.6} className="animate-pulse" /></span>
              <h2 className="mt-6 text-[26px]">Nous construisons votre identité…</h2>
              <p className="mx-auto mt-2 max-w-md text-[16px] text-ink-secondary">Positionnement, cibles et palette sont en cours d&apos;élaboration à partir de vos réponses. Cela prend quelques secondes.</p>
              <div className="mx-auto mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">{[0, 1, 2].map((i) => (<div key={i} className="shimmer h-28 rounded-2xl" style={{ animationDelay: `${i * 0.2}s` }} />))}</div>
            </div>
          </div>
        </section>
      );
    }

    return (
      <section className="rise">
        <PageHeader tab="identity" />
        <div className="space-y-6">
          <Group n={1} Icon={Building2} title="Votre marque" hint="Les bases : qui vous êtes et ce que vous proposez.">
            <div className="grid gap-5 sm:grid-cols-2">
              <div><label className="label" htmlFor="q1">Nom de la marque</label><input id="q1" className="input" value={q.brand_name} onChange={(e) => set("brand_name", e.target.value)} /></div>
              <div><label className="label" htmlFor="q2">Secteur d&apos;activité</label><input id="q2" className="input" value={q.sector} onChange={(e) => set("sector", e.target.value)} /></div>
            </div>
            <div><label className="label" htmlFor="q3">En une phrase, que vend ou propose cette marque ?</label><input id="q3" className="input" placeholder="Ex. : des tenues africaines modernes sur mesure" value={q.offer} onChange={(e) => set("offer", e.target.value)} /></div>
          </Group>

          <Group n={2} Icon={Users} title="Vos clients" hint="Qui vous voulez toucher, et pourquoi vous.">
            <div>
              <span className="label">Qui sont les clients actuels ou visés ? <span className="font-normal text-ink-secondary">(jusqu&apos;à 3 segments)</span></span>
              <div className="space-y-2.5">
                {q.segments.map((sg, i) => (
                  <div key={i} className="flex gap-2">
                    <input aria-label={`Segment ${i + 1}`} className="input" placeholder="Âge, situation, besoin principal" value={sg} onChange={(e) => set("segments", q.segments.map((x, j) => (j === i ? e.target.value : x)))} />
                    {q.segments.length > 1 && (<button type="button" className="btn-secondary !px-3.5" aria-label={`Retirer le segment ${i + 1}`} onClick={() => set("segments", q.segments.filter((_, j) => j !== i))}><X size={16} /></button>)}
                  </div>
                ))}
              </div>
              {q.segments.length < 3 && (<button type="button" className="btn-ghost mt-2 !px-3 text-accent" onClick={() => set("segments", [...q.segments, ""])}><Plus size={16} />Ajouter un segment</button>)}
            </div>
            <div><label className="label" htmlFor="q5">Quel problème cette marque résout-elle pour ses clients ?</label><textarea id="q5" rows={3} className="input" value={q.problem} onChange={(e) => set("problem", e.target.value)} /></div>
            <div><label className="label" htmlFor="q6">Qu&apos;est-ce qui différencie cette marque de ses concurrents ?</label><textarea id="q6" rows={3} className="input" value={q.differentiation} onChange={(e) => set("differentiation", e.target.value)} /></div>
          </Group>

          <Group n={3} Icon={Heart} title="Votre personnalité" hint="Le caractère de la marque et son objectif.">
            <div>
              <span className="label">Trois mots qui décrivent la personnalité de la marque</span>
              <div className="grid gap-3 sm:grid-cols-3">
                {q.personality.map((w, i) => (<input key={i} aria-label={`Mot ${i + 1}`} className="input" placeholder={["rigoureux", "chaleureux", "audacieux"][i]} value={w} onChange={(e) => set("personality", q.personality.map((x, j) => (j === i ? e.target.value : x)))} />))}
              </div>
            </div>
            <div>
              <span className="label">Objectif principal des réseaux sociaux</span>
              <div role="radiogroup" aria-label="Objectif principal" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {GOALS.map((g) => (
                  <button key={g} type="button" role="radio" aria-checked={q.goal === g} onClick={() => set("goal", g)}
                    className={`rounded-2xl border px-4 py-3.5 text-left text-[15px] font-medium transition ${q.goal === g ? "border-accent bg-accent-soft text-accent shadow-[0_0_0_3px_rgba(0,113,227,0.12)]" : "border-black/10 bg-white hover:border-black/25"}`}>
                    {GOAL_LABELS[g]}
                  </button>
                ))}
              </div>
            </div>
          </Group>

          <Group n={4} Icon={Megaphone} title="Votre présence" hint="Où vous publiez, et ce qu'il faut éviter.">
            <div>
              <span className="label">Canaux présents ou souhaités</span>
              <div className="flex flex-wrap gap-2.5">
                {CHANNELS.map((c) => {
                  const on = q.channels.includes(c);
                  return (
                    <button key={c} type="button" aria-pressed={on} onClick={() => set("channels", on ? q.channels.filter((x) => x !== c) : [...q.channels, c])}
                      className={`flex items-center gap-1.5 rounded-pill border px-4 py-2 text-[15px] font-medium transition ${on ? "border-accent bg-accent text-white shadow-glow" : "border-black/10 bg-white hover:border-black/25"}`}>
                      {on && <Check size={15} strokeWidth={3} />}{c}
                    </button>
                  );
                })}
              </div>
              <button type="button" className="btn-ghost mt-2 !px-3 text-accent" onClick={() => setCustom((v) => !v)}>{custom ? "Masquer" : "+ Autre canal"}</button>
              {custom && (<input aria-label="Autre canal" className="input mt-2" placeholder="Nom du canal puis Entrée"
                onKeyDown={(e) => { if (e.key === "Enter") { const v = (e.target as HTMLInputElement).value.trim(); if (v && !q.channels.includes(v)) set("channels", [...q.channels, v]); (e.target as HTMLInputElement).value = ""; } }} />)}
            </div>
            <div><label className="label" htmlFor="q10">Sujets ou formulations à éviter absolument <span className="font-normal text-ink-secondary">(facultatif)</span></label><textarea id="q10" rows={2} className="input" value={q.avoid} onChange={(e) => set("avoid", e.target.value)} /></div>
          </Group>
        </div>

        {formError && <p role="alert" className="mt-5 rounded-2xl bg-danger/10 px-5 py-3.5 text-[15px]">{formError}</p>}
        {error && <GenerateError message={error} onRetry={generate} />}
        <div className="sticky bottom-4 z-10 mt-8">
          <div className="glass-float flex flex-wrap items-center justify-between gap-4 rounded-[24px] px-6 py-4 shadow-pop">
            <p className="flex items-center gap-2 text-[14px] text-ink-secondary"><ShieldCheck size={17} className="text-success" />Vos réponses restent privées et servent uniquement à générer votre identité.</p>
            <button type="button" className="btn-primary" onClick={generate} disabled={loading}><Sparkles size={18} />Générer mon identité de marque</button>
          </div>
        </div>
      </section>
    );
  }

  const segments = identity.target_segments ?? [];
  const palette = identity.visual_palette ?? [];
  const objectives = identity.marketing_objectives ?? [];

  return (
    <section className="rise">
      <PageHeader tab="identity"><SaveIndicator state={save} /></PageHeader>
      <p className="caption -mt-4 mb-2">Cliquez sur un texte pour le modifier : les changements sont enregistrés automatiquement.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <article className="card-flat">
          <div className="flex items-center gap-3"><span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Target size={19} strokeWidth={1.8} /></span><h2 className="section-title">Positionnement</h2></div>
          <div className="mt-3">
            <EditableText multiline label="Positionnement" value={identity.positioning ?? ""} onSave={(v) => persist({ positioning: v })} />
          </div>
          <h3 className="mt-7 border-t hairline pt-5 text-[13px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">Objectifs marketing</h3>
          <ul className="mt-2 space-y-1">
            {objectives.map((o, i) => (
              <li key={i}>
                <EditableText label={`Objectif ${i + 1}`} value={o} onSave={(v) => persist({ marketing_objectives: objectives.map((x, j) => (j === i ? v : x)).filter((x) => x.trim()) })} />
              </li>
            ))}
          </ul>
        </article>
        <article className="card-flat">
          <div className="flex items-center gap-3"><span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Users size={19} strokeWidth={1.8} /></span><h2 className="section-title">Cibles prioritaires</h2></div>
          <div className="mt-3 space-y-4">
            {segments.map((s, i) => {
              const upd = (k: keyof Segment) => (v: string) => persist({ target_segments: segments.map((x, j) => (j === i ? { ...x, [k]: v } : x)) });
              return (
                <div key={i} className="rounded-xl bg-canvas p-3">
                  <EditableText label={`Nom du segment ${i + 1}`} className="font-semibold" value={s.name} onSave={upd("name")} />
                  <EditableText multiline label={`Description du segment ${i + 1}`} className="text-[15px]" value={s.description} onSave={upd("description")} />
                  <EditableText multiline label={`Besoin du segment ${i + 1}`} className="text-[15px] text-ink-secondary" value={s.need} onSave={upd("need")} />
                </div>
              );
            })}
          </div>
        </article>
        <article className="card-flat">
          <div className="flex items-center gap-3"><span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><Palette size={19} strokeWidth={1.8} /></span><h2 className="section-title">Palette visuelle obligatoire</h2></div>
          <div className="mt-3 space-y-3">
            {palette.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <input type="color" aria-label={`Couleur ${i + 1}`} value={/^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : "#000000"}
                  onChange={(e) => setIdentity({ ...identity, visual_palette: palette.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })}
                  onBlur={() => persist({ visual_palette: palette })}
                  className="mt-1 h-11 w-11 shrink-0 cursor-pointer rounded-xl border border-black/10 bg-white p-1 shadow-card" />
                <div className="min-w-0 flex-1">
                  <p className="caption px-2">{c.color.toUpperCase()}</p>
                  <EditableText multiline label={`Usage de la couleur ${i + 1}`} className="text-[15px]" value={c.usage} onSave={(v) => persist({ visual_palette: palette.map((x, j) => (j === i ? { ...x, usage: v } : x)) })} />
                </div>
              </div>
            ))}
          </div>
        </article>
      </div>
      <div className="mt-8 flex items-center gap-4">
        <button type="button" className="btn-secondary" disabled={loading} onClick={() => {
          if (window.confirm("Regénérer l'identité remplacera le contenu actuel, y compris vos modifications. Continuer ?")) {
            setQ((s) => ({ ...s, ...(identity.questionnaire ?? {}) }));
            setIdentity(null);
          }
        }}>
          Regénérer l&apos;identité
        </button>
      </div>
    </section>
  );
}
