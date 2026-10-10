"use client";

import { LayoutGrid, Plus, Sparkles, Table2, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { callGenerate } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import EditableText from "./EditableText";
import EmptyState from "./EmptyState";
import GenerateError from "./GenerateError";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import { notifyProgress } from "@/lib/progressEvents";

export type Persona = { id: string; name: string; profile: string; needs: string; frictions: string; tone: string; levers: string; channels: string[]; priority: "principal" | "secondaire"; position: number };
type PillarLink = { id: string; name: string; persona_ids: string[] };
const COLUMNS = "id, name, profile, needs, frictions, tone, levers, channels, priority, position";
const NETWORKS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "WhatsApp", "Site web"];
const FIELDS = [
  ["needs", "Besoins", "Ce qu'elle cherche."],
  ["frictions", "Freins", "Ce qui l'empêche d'agir ou de faire confiance."],
  ["tone", "Tonalité adaptée", "Comment lui parler, ce qu'on évite."],
  ["levers", "Leviers d'engagement", "Ce qui la fait réagir ou agir."],
] as const;

export default function PersonasTab({ brandId, initial, pillars: initialPillars, hasIdentity }: { brandId: string; initial: Persona[]; pillars: PillarLink[]; hasIdentity: boolean }) {
  const supabase = createClient();
  const [personas, setPersonas] = useState<Persona[]>(initial);
  const [pillars, setPillars] = useState<PillarLink[]>(initialPillars);
  const [view, setView] = useState<"fiches" | "matrice">("fiches");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");

  async function generate() {
    if (personas.length > 0 && !window.confirm("Regénérer remplacera vos cibles actuelles, y compris vos modifications, et détachera les piliers qui y étaient reliés. Continuer ?")) return;
    setLoading(true);
    setError(null);
    const res = await callGenerate({ type: "personas", brand_profile_id: brandId });
    if (!res.ok) { setLoading(false); return setError(res.error); }
    const { data } = await supabase.from("personas").select(COLUMNS).eq("brand_profile_id", brandId).order("position");
    setPersonas((data as Persona[]) ?? []);
    setPillars((ps) => ps.map((p) => ({ ...p, persona_ids: [] })));
    setLoading(false);
    notifyProgress();
  }

  async function patch(id: string, p: Partial<Persona>) {
    setPersonas((ps) => ps.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("personas").update(p).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function add() {
    setSave("saving");
    const { data, error: err } = await supabase.from("personas").insert({ brand_profile_id: brandId, name: "Nouvelle cible", position: personas.length, priority: personas.length === 0 ? "principal" : "secondaire" }).select(COLUMNS).single();
    if (err || !data) return setSave(err?.code === "42501" ? "error" : "error");
    setPersonas((ps) => [...ps, data as Persona]);
    setSave("saved");
    notifyProgress();
  }

  async function remove(p: Persona) {
    if (!window.confirm(`Supprimer la cible « ${p.name} » ?`)) return;
    setSave("saving");
    const { error: err } = await supabase.from("personas").delete().eq("id", p.id);
    if (err) return setSave("error");
    setPersonas((ps) => ps.filter((x) => x.id !== p.id));
    setSave("saved");
  }

  async function toggleLink(pillar: PillarLink, personaId: string) {
    const next = pillar.persona_ids.includes(personaId) ? pillar.persona_ids.filter((x) => x !== personaId) : [...pillar.persona_ids, personaId];
    setPillars((ps) => ps.map((x) => (x.id === pillar.id ? { ...x, persona_ids: next } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("content_pillars").update({ persona_ids: next }).eq("id", pillar.id);
    setSave(err ? "error" : "saved");
  }

  if (!hasIdentity) {
    return (
      <section>
        <PageHeader tab="personas" />
        <EmptyState illustration="identity" title="Commencez par l'identité de la marque" text="Les cibles se déduisent de ce que fait la marque et de ce qu'elle veut obtenir : définissez d'abord son identité.">
          <Link href="/dashboard/identity" className="btn-primary">Aller à l&apos;identité de marque</Link>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="rise">
      <PageHeader tab="personas">
        <SaveIndicator state={save} />
        <button type="button" className="btn-secondary" onClick={add}><Plus size={16} />Ajouter</button>
        <button type="button" className="btn-primary" onClick={generate} disabled={loading}><Sparkles size={16} />{loading ? "Analyse en cours…" : personas.length ? "Regénérer avec l'IA" : "Construire avec l'IA"}</button>
      </PageHeader>
      {error && <GenerateError message={error} onRetry={generate} />}

      {personas.length === 0 ? (
        <div className="mt-6">
          <EmptyState illustration="identity" title="Qui voulez-vous toucher ?" text="Une cible n'est pas un portrait inventé : c'est une hypothèse de travail qui décrit un groupe de personnes, ses besoins, ses freins, la façon de lui parler et ce qui la pousse à agir. L'IA en propose à partir de votre identité ; vous corrigez avec ce que vous voyez sur le terrain.">
            <button type="button" className="btn-primary" onClick={generate} disabled={loading}><Sparkles size={16} />{loading ? "Analyse en cours…" : "Construire mes cibles avec l'IA"}</button>
            <button type="button" className="btn-secondary" onClick={add}>Les décrire moi-même</button>
          </EmptyState>
        </div>
      ) : (
        <>
          <div className="mt-2 flex rounded-pill bg-white p-1 shadow-card w-fit" role="group" aria-label="Affichage">
            {([["fiches", "Fiches", LayoutGrid], ["matrice", "Matrice", Table2]] as const).map(([v, label, Icon]) => (
              <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} className={`flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-[14px] font-medium ${view === v ? "bg-accent text-white" : "text-ink-secondary"}`}><Icon size={15} />{label}</button>
            ))}
          </div>

          {view === "fiches" ? (
            <div className="mt-5 grid gap-5 xl:grid-cols-2">
              {personas.map((p) => (
                <article key={p.id} className="card-flat relative overflow-hidden">
                  <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${p.priority === "principal" ? "bg-accent" : "bg-black/10"}`} />
                  <div className="flex flex-wrap items-start justify-between gap-2 pl-2">
                    <div className="min-w-0 flex-1"><EditableText label="Nom de la cible" className="text-[20px] font-semibold" value={p.name} onSave={(v) => v.trim() && patch(p.id, { name: v.trim() })} /></div>
                    <button type="button" className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${p.priority === "principal" ? "bg-accent-soft text-accent" : "bg-black/[0.06] text-ink-secondary"}`} aria-label={`Priorité : ${p.priority}. Cliquer pour changer`} onClick={() => patch(p.id, { priority: p.priority === "principal" ? "secondaire" : "principal" })}>{p.priority === "principal" ? "Cible principale" : "Cible secondaire"}</button>
                  </div>
                  <div className="pl-2"><EditableText multiline label="Profil" className="text-[15px] text-ink-secondary" placeholder="Qui sont-ils ? Âge, situation, contexte." value={p.profile} onSave={(v) => patch(p.id, { profile: v })} /></div>
                  <dl className="mt-3 grid gap-x-5 gap-y-3 pl-2 sm:grid-cols-2">
                    {FIELDS.map(([key, label, hint]) => (
                      <div key={key}><dt className="caption px-2 font-semibold uppercase tracking-[0.08em]">{label}</dt><dd><EditableText multiline label={`${label} de ${p.name}`} className="text-[15px]" placeholder={hint} value={p[key]} onSave={(v) => patch(p.id, { [key]: v })} /></dd></div>
                    ))}
                  </dl>
                  <div className="mt-3 pl-2">
                    <p className="caption mb-1.5 px-2 font-semibold uppercase tracking-[0.08em]">Où les joindre</p>
                    <div className="flex flex-wrap gap-1.5 px-2">
                      {NETWORKS.map((n) => {
                        const on = p.channels.includes(n);
                        return <button key={n} type="button" aria-pressed={on} onClick={() => patch(p.id, { channels: on ? p.channels.filter((x) => x !== n) : [...p.channels, n] })} className={`rounded-pill border px-3 py-1 text-[13px] font-medium ${on ? "border-accent bg-accent text-white" : "border-black/10 bg-white text-ink-secondary"}`}>{n}</button>;
                      })}
                    </div>
                  </div>
                  <button type="button" className="btn-ghost mt-3 ml-2 !px-3 text-[14px] text-ink-secondary hover:text-danger" onClick={() => remove(p)}><Trash2 size={15} />Supprimer</button>
                </article>
              ))}
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              <div className="card-flat overflow-x-auto">
                <h2 className="section-title">Matrice des cibles</h2>
                <table className="mt-3 w-full min-w-[820px] text-left text-[14px]">
                  <thead><tr className="caption"><th className="w-[16%] py-2 pr-3">Cible</th><th className="py-2 pr-3">Besoins</th><th className="py-2 pr-3">Freins</th><th className="py-2 pr-3">Tonalité adaptée</th><th className="py-2">Leviers d&apos;engagement</th></tr></thead>
                  <tbody>
                    {personas.map((p) => (
                      <tr key={p.id} className="border-t hairline align-top">
                        <td className="py-3 pr-3"><span className="font-semibold">{p.name}</span><br /><span className={`text-[12px] ${p.priority === "principal" ? "text-accent" : "text-ink-secondary"}`}>{p.priority === "principal" ? "Principale" : "Secondaire"}</span></td>
                        <td className="py-3 pr-3">{p.needs || "—"}</td><td className="py-3 pr-3">{p.frictions || "—"}</td><td className="py-3 pr-3">{p.tone || "—"}</td><td className="py-3">{p.levers || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="card-flat overflow-x-auto">
                <h2 className="section-title">Quel pilier sert quelle cible ?</h2>
                <p className="mt-1 text-[15px] text-ink-secondary">Cochez les cibles que chaque pilier doit servir. Un pilier sans cible ne répond à aucun besoin du public.</p>
                {pillars.length === 0 ? (
                  <p className="mt-3 text-[15px] text-ink-secondary">Aucun pilier pour l&apos;instant. <Link href="/dashboard/pillars" className="text-accent">Construire les piliers</Link></p>
                ) : (
                  <table className="mt-3 w-full text-left text-[14px]">
                    <thead><tr className="caption"><th className="py-2 pr-3">Pilier</th>{personas.map((p) => <th key={p.id} className="px-2 py-2 text-center">{p.name}</th>)}</tr></thead>
                    <tbody>
                      {pillars.map((pl) => (
                        <tr key={pl.id} className="border-t hairline">
                          <td className="py-2.5 pr-3 font-medium">{pl.name}</td>
                          {personas.map((p) => (
                            <td key={p.id} className="px-2 py-2.5 text-center"><input type="checkbox" aria-label={`${pl.name} sert ${p.name}`} className="h-5 w-5 accent-[var(--color-accent)]" checked={pl.persona_ids.includes(p.id)} onChange={() => toggleLink(pl, p.id)} /></td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}
