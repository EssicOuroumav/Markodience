"use client";

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
    return (
      <section>
        <PageHeader tab="identity" />
        <div className="mt-8 space-y-6">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="q1">1. Nom de la marque</label>
              <input id="q1" className="input" value={q.brand_name} onChange={(e) => set("brand_name", e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="q2">2. Secteur d&apos;activité</label>
              <input id="q2" className="input" value={q.sector} onChange={(e) => set("sector", e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="q3">3. En une phrase, que vend ou propose cette marque ?</label>
            <input id="q3" className="input" value={q.offer} onChange={(e) => set("offer", e.target.value)} />
          </div>
          <div>
            <span className="label">4. Qui sont les clients actuels ou visés ? (jusqu&apos;à 3 segments)</span>
            <div className="space-y-2">
              {q.segments.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input aria-label={`Segment ${i + 1}`} className="input" placeholder="Âge, situation, besoin principal" value={s} onChange={(e) => set("segments", q.segments.map((x, j) => (j === i ? e.target.value : x)))} />
                  {q.segments.length > 1 && (
                    <button type="button" className="btn-secondary" aria-label={`Retirer le segment ${i + 1}`} onClick={() => set("segments", q.segments.filter((_, j) => j !== i))}>×</button>
                  )}
                </div>
              ))}
            </div>
            {q.segments.length < 3 && (
              <button type="button" className="btn-secondary mt-2" onClick={() => set("segments", [...q.segments, ""])}>+ Ajouter un segment</button>
            )}
          </div>
          <div>
            <label className="label" htmlFor="q5">5. Quel problème cette marque résout-elle pour ses clients ?</label>
            <textarea id="q5" rows={3} className="input" value={q.problem} onChange={(e) => set("problem", e.target.value)} />
          </div>
          <div>
            <label className="label" htmlFor="q6">6. Qu&apos;est-ce qui différencie cette marque de ses concurrents ?</label>
            <textarea id="q6" rows={3} className="input" value={q.differentiation} onChange={(e) => set("differentiation", e.target.value)} />
          </div>
          <div>
            <span className="label">7. Trois mots qui décrivent la personnalité de la marque</span>
            <div className="grid gap-2 sm:grid-cols-3">
              {q.personality.map((w, i) => (
                <input key={i} aria-label={`Mot ${i + 1}`} className="input" placeholder={["rigoureux", "chaleureux", "audacieux"][i]} value={w} onChange={(e) => set("personality", q.personality.map((x, j) => (j === i ? e.target.value : x)))} />
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="q8">8. Objectif principal des réseaux sociaux</label>
            <select id="q8" className="input" value={q.goal} onChange={(e) => set("goal", e.target.value as Questionnaire["goal"])}>
              {GOALS.map((g) => (<option key={g} value={g}>{GOAL_LABELS[g]}</option>))}
            </select>
          </div>
          <div>
            <span className="label">9. Canaux présents ou souhaités</span>
            <div className="flex flex-wrap gap-2">
              {CHANNELS.map((c) => {
                const on = q.channels.includes(c);
                return (
                  <button key={c} type="button" aria-pressed={on} onClick={() => set("channels", on ? q.channels.filter((x) => x !== c) : [...q.channels, c])}
                    className={`rounded-pill border px-4 py-2 text-[15px] transition ${on ? "border-accent bg-accent text-white" : "border-line hover:bg-bg-secondary"}`}>
                    {c}
                  </button>
                );
              })}
            </div>
            <button type="button" className="caption mt-2 underline" onClick={() => setCustom((v) => !v)}>{custom ? "Masquer" : "Autre canal ?"}</button>
            {custom && (
              <input aria-label="Autre canal" className="input mt-2" placeholder="Nom du canal puis Entrée"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const v = (e.target as HTMLInputElement).value.trim();
                    if (v && !q.channels.includes(v)) set("channels", [...q.channels, v]);
                    (e.target as HTMLInputElement).value = "";
                  }
                }} />
            )}
          </div>
          <div>
            <label className="label" htmlFor="q10">10. Sujets ou formulations à éviter absolument (facultatif)</label>
            <textarea id="q10" rows={2} className="input" value={q.avoid} onChange={(e) => set("avoid", e.target.value)} />
          </div>
        </div>
        {formError && <p role="alert" className="mt-4 text-[15px] text-danger">{formError}</p>}
        {error && <GenerateError message={error} onRetry={generate} />}
        <button type="button" className="btn-primary mt-6" onClick={generate} disabled={loading}>
          {loading ? "Génération en cours…" : "Générer mon identité de marque"}
        </button>
      </section>
    );
  }

  const segments = identity.target_segments ?? [];
  const palette = identity.visual_palette ?? [];
  const objectives = identity.marketing_objectives ?? [];

  return (
    <section>
      <PageHeader tab="identity"><SaveIndicator state={save} /></PageHeader>
      <p className="caption -mt-4 mb-2">Cliquez sur un texte pour le modifier : les changements sont enregistrés automatiquement.</p>
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <article className="card">
          <h2 className="text-[20px]">Positionnement</h2>
          <div className="mt-3">
            <EditableText multiline label="Positionnement" value={identity.positioning ?? ""} onSave={(v) => persist({ positioning: v })} />
          </div>
          <h3 className="mt-6 text-[15px]">Objectifs marketing</h3>
          <ul className="mt-2 space-y-1">
            {objectives.map((o, i) => (
              <li key={i}>
                <EditableText label={`Objectif ${i + 1}`} value={o} onSave={(v) => persist({ marketing_objectives: objectives.map((x, j) => (j === i ? v : x)).filter((x) => x.trim()) })} />
              </li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h2 className="text-[20px]">Cibles prioritaires</h2>
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
        <article className="card">
          <h2 className="text-[20px]">Palette visuelle obligatoire</h2>
          <div className="mt-3 space-y-3">
            {palette.map((c, i) => (
              <div key={i} className="flex items-start gap-3">
                <input type="color" aria-label={`Couleur ${i + 1}`} value={/^#[0-9a-fA-F]{6}$/.test(c.color) ? c.color : "#000000"}
                  onChange={(e) => setIdentity({ ...identity, visual_palette: palette.map((x, j) => (j === i ? { ...x, color: e.target.value } : x)) })}
                  onBlur={() => persist({ visual_palette: palette })}
                  className="mt-1 h-9 w-12 shrink-0 cursor-pointer rounded-btn border border-line bg-bg p-1" />
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
