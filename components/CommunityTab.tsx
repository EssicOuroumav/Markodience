"use client";

import { Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { callGenerate } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import {
  COMMUNITY_KINDS, COMMUNITY_KIND_HINT, COMMUNITY_KIND_LABEL, CRISIS_LEVELS, CRISIS_LEVEL_LABEL, INTERACTION_STATUSES, INTERACTION_STATUS_LABEL, INTERACTION_TEMPS, TEMP_HINT, TEMP_LABEL,
  type CommunityKind, type CrisisLevel, type InteractionStatus, type InteractionTemp,
} from "@/lib/community/schemas";
import EditableText from "./EditableText";
import EmptyState from "./EmptyState";
import GenerateError from "./GenerateError";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

export type CommunityItem = { id: string; kind: CommunityKind; title: string; situation: string; body: string; level: CrisisLevel | null; owner: string; source: "manuel" | "ia"; position: number };
export type Interaction = { id: string; person: string; network: string; temperature: InteractionTemp; note: string; next_step: string; due_date: string | null; status: InteractionStatus; created_at: string };

const ITEM_COLS = "id, kind, title, situation, body, level, owner, source, position";
const INT_COLS = "id, person, network, temperature, note, next_step, due_date, status, created_at";
const NETWORKS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "WhatsApp", "Site web"];
const TEMP_CLS: Record<InteractionTemp, string> = { chaude: "bg-danger/15 text-danger", tiede: "bg-warning/25 text-ink", froide: "bg-accent-soft text-accent" };
const LEVEL_CLS: Record<CrisisLevel, string> = { faible: "border-l-success/70", moyen: "border-l-warning", grave: "border-l-danger" };
const today = () => new Date().toISOString().slice(0, 10);

type Section = "reponses" | "crise" | "interactions";

export default function CommunityTab({ brandId, initialItems, initialInteractions, hasIdentity }: { brandId: string; initialItems: CommunityItem[]; initialInteractions: Interaction[]; hasIdentity: boolean }) {
  const supabase = createClient();
  const [items, setItems] = useState(initialItems);
  const [ints, setInts] = useState(initialInteractions);
  const [section, setSection] = useState<Section>("reponses");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ kind: "faq" as CommunityKind, title: "", situation: "", body: "", level: "moyen" as CrisisLevel });
  const [iform, setIform] = useState({ person: "", network: "Facebook", temperature: "tiede" as InteractionTemp, note: "", next_step: "", due_date: "" });
  const [tempFilter, setTempFilter] = useState<InteractionTemp | "all">("all");

  const of = (k: CommunityKind) => items.filter((i) => i.kind === k);
  const replies = [...of("faq"), ...of("script")];

  async function generate() {
    setLoading(true);
    setError(null);
    const res = await callGenerate({ type: "community", brand_profile_id: brandId });
    if (!res.ok) { setLoading(false); return setError(res.error); }
    const { data } = await supabase.from("community_items").select(ITEM_COLS).eq("brand_profile_id", brandId).order("position");
    setItems((data as CommunityItem[]) ?? []);
    setLoading(false);
  }

  async function addItem() {
    setError(null);
    if (!form.title.trim() || !form.body.trim()) return setError("Écrivez le titre et le texte.");
    setSave("saving");
    const row = { brand_profile_id: brandId, kind: form.kind, title: form.title.trim().slice(0, 160), situation: form.situation.trim().slice(0, 600), body: form.body.trim().slice(0, 3000), level: form.kind === "crise" ? form.level : null, source: "manuel", position: items.length };
    const { data, error: err } = await supabase.from("community_items").insert(row).select(ITEM_COLS).single();
    if (err || !data) { setSave("error"); return setError(err?.code === "42501" ? "Ajouter demande un palier payant, ou la limite de 80 éléments est atteinte." : "L'élément n'a pas pu être enregistré."); }
    setItems((is) => [...is, data as CommunityItem]);
    setForm({ ...form, title: "", situation: "", body: "" });
    setAdding(false);
    setSave("saved");
  }

  async function patchItem(id: string, p: Partial<CommunityItem>) {
    setItems((is) => is.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("community_items").update(p).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function removeItem(id: string) {
    if (!window.confirm("Supprimer cet élément ?")) return;
    setSave("saving");
    const { error: err } = await supabase.from("community_items").delete().eq("id", id);
    if (err) return setSave("error");
    setItems((is) => is.filter((i) => i.id !== id));
    setSave("saved");
  }

  async function addInteraction() {
    setError(null);
    if (!iform.person.trim()) return setError("Indiquez la personne ou le compte.");
    setSave("saving");
    const row = { brand_profile_id: brandId, person: iform.person.trim().slice(0, 120), network: iform.network, temperature: iform.temperature, note: iform.note.trim().slice(0, 1000), next_step: iform.next_step.trim().slice(0, 400), due_date: iform.due_date || null, status: "a_suivre" };
    const { data, error: err } = await supabase.from("interactions").insert(row).select(INT_COLS).single();
    if (err || !data) { setSave("error"); return setError(err?.code === "42501" ? "Le suivi demande un palier payant, ou la limite de 300 interactions est atteinte." : "L'interaction n'a pas pu être enregistrée."); }
    setInts((is) => [data as Interaction, ...is]);
    setIform({ ...iform, person: "", note: "", next_step: "", due_date: "" });
    setAdding(false);
    setSave("saved");
  }

  async function patchInt(id: string, p: Partial<Interaction>) {
    setInts((is) => is.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("interactions").update(p).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function removeInt(id: string) {
    if (!window.confirm("Supprimer cette interaction ?")) return;
    setSave("saving");
    const { error: err } = await supabase.from("interactions").delete().eq("id", id);
    if (err) return setSave("error");
    setInts((is) => is.filter((i) => i.id !== id));
    setSave("saved");
  }

  const shownInts = ints.filter((i) => tempFilter === "all" || i.temperature === tempFilter);
  const late = (i: Interaction) => !!i.due_date && i.due_date < today() && (i.status === "a_suivre" || i.status === "en_cours");
  const SECTIONS: { id: Section; label: string; n: number }[] = [
    { id: "reponses", label: "Réponses & scripts", n: replies.length },
    { id: "crise", label: "Gestion de crise", n: of("crise").length },
    { id: "interactions", label: "Suivi des interactions", n: ints.length },
  ];

  return (
    <section className="rise">
      <PageHeader tab="community">
        <SaveIndicator state={save} />
        <button type="button" className="btn-secondary" onClick={() => { setAdding((v) => !v); setError(null); }}><Plus size={16} />{section === "interactions" ? "Ajouter une interaction" : "Ajouter un élément"}</button>
      </PageHeader>

      <div role="tablist" aria-label="Sections" className="flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button key={s.id} role="tab" type="button" aria-selected={section === s.id} onClick={() => { setSection(s.id); setAdding(false); setError(null); if (s.id === "crise") setForm((f) => ({ ...f, kind: "crise" })); else if (s.id === "reponses") setForm((f) => ({ ...f, kind: f.kind === "crise" ? "faq" : f.kind })); }}
            className={`rounded-pill px-5 py-2 text-[15px] font-medium transition ${section === s.id ? "bg-night text-white shadow-card" : "bg-white text-ink-secondary shadow-card hover:text-ink"}`}>
            {s.label} <span className="ml-1 opacity-70">{s.n}</span>
          </button>
        ))}
      </div>

      {section !== "interactions" && (
        <div className="card-flat mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-2xl text-[15px] text-ink-secondary">{section === "crise" ? COMMUNITY_KIND_HINT.crise : `${COMMUNITY_KIND_HINT.faq} ${COMMUNITY_KIND_HINT.script}`}</p>
          {hasIdentity ? (
            <button type="button" className="btn-primary" onClick={generate} disabled={loading}><Sparkles size={16} />{loading ? "Génération…" : items.some((i) => i.source === "ia") ? "Régénérer avec l'IA" : "Générer avec l'IA"}</button>
          ) : (
            <p className="text-[15px] text-ink-secondary">Il faut d&apos;abord l&apos;identité. <Link href="/dashboard/identity" className="text-accent">Définir l&apos;identité</Link></p>
          )}
        </div>
      )}
      {error && <GenerateError message={error} onRetry={() => setError(null)} />}

      {adding && section !== "interactions" && (
        <div className="card-flat mt-5 space-y-4">
          <h2 className="section-title">Nouvel élément</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <div><label className="label" htmlFor="c-kind">Type</label>
              <select id="c-kind" className="input" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as CommunityKind })}>
                {COMMUNITY_KINDS.filter((k) => (section === "crise") === (k === "crise")).map((k) => <option key={k} value={k}>{COMMUNITY_KIND_LABEL[k]}</option>)}
              </select></div>
            {form.kind === "crise" && <div><label className="label" htmlFor="c-level">Gravité</label><select id="c-level" className="input" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value as CrisisLevel })}>{CRISIS_LEVELS.map((l) => <option key={l} value={l}>{CRISIS_LEVEL_LABEL[l]}</option>)}</select></div>}
          </div>
          <div><label className="label" htmlFor="c-title">{form.kind === "faq" ? "Question" : form.kind === "script" ? "Situation" : "Type d'incident"}</label><input id="c-title" className="input" maxLength={160} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          {form.kind !== "faq" && <div><label className="label" htmlFor="c-sit">Contexte ou signes qui permettent de le reconnaître</label><input id="c-sit" className="input" maxLength={600} value={form.situation} onChange={(e) => setForm({ ...form, situation: e.target.value })} /></div>}
          <div><label className="label" htmlFor="c-body">{form.kind === "crise" ? "Étapes, dans l'ordre, et qui décide" : "Réponse"}</label><textarea id="c-body" className="input min-h-[110px]" maxLength={3000} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></div>
          <div className="flex gap-3"><button type="button" className="btn-primary" onClick={addItem}>Ajouter</button><button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Annuler</button></div>
        </div>
      )}

      {section === "reponses" && (
        <div className="mt-6 space-y-8">
          {replies.length === 0 ? (
            <EmptyState illustration="chat" title="Aucune réponse type pour l'instant" text="Générez un premier guide avec l'IA à partir de l'identité de la marque, puis corrigez-le : chaque réponse validée évite d'improviser sous pression." />
          ) : (["faq", "script"] as const).map((k) => of(k).length > 0 && (
            <div key={k}>
              <h2 className="section-title">{COMMUNITY_KIND_LABEL[k]}</h2>
              <div className="mt-3 grid gap-4 lg:grid-cols-2">
                {of(k).map((it) => (
                  <article key={it.id} className="card-flat !p-5">
                    <div className="flex items-start justify-between gap-2">
                      <EditableText label="Titre" value={it.title} onSave={(v) => v.trim() && patchItem(it.id, { title: v.trim().slice(0, 160) })} className="text-[17px] font-semibold" />
                      <button type="button" aria-label={`Supprimer ${it.title}`} onClick={() => removeItem(it.id)} className="rounded-full p-1.5 text-ink-secondary hover:bg-black/5 hover:text-danger"><Trash2 size={15} /></button>
                    </div>
                    {k === "script" && <EditableText label="Contexte" value={it.situation} onSave={(v) => patchItem(it.id, { situation: v.slice(0, 600) })} placeholder="Contexte" className="text-[14px] text-ink-secondary" multiline />}
                    <div className="mt-2 rounded-2xl bg-canvas p-1"><EditableText label="Réponse" value={it.body} onSave={(v) => v.trim() && patchItem(it.id, { body: v.trim().slice(0, 3000) })} className="text-[15px]" multiline /></div>
                    {it.source === "ia" && <p className="caption mt-2">Proposé par l&apos;IA : relisez et complétez les [à compléter].</p>}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {section === "crise" && (
        <div className="mt-6">
          {of("crise").length === 0 ? (
            <EmptyState illustration="rules" title="Aucun protocole de crise" text="Trois niveaux suffisent : une critique isolée, une critique reprise, une atteinte grave. Générez-les avec l'IA ou écrivez les vôtres." />
          ) : (
            <div className="space-y-4">
              {[...of("crise")].sort((a, b) => CRISIS_LEVELS.indexOf(a.level ?? "moyen") - CRISIS_LEVELS.indexOf(b.level ?? "moyen")).map((it) => (
                <article key={it.id} className={`card-flat border-l-4 !p-5 ${LEVEL_CLS[it.level ?? "moyen"]}`}>
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="eyebrow">{CRISIS_LEVEL_LABEL[it.level ?? "moyen"]}</p>
                      <EditableText label="Type d'incident" value={it.title} onSave={(v) => v.trim() && patchItem(it.id, { title: v.trim().slice(0, 160) })} className="text-[18px] font-semibold" />
                      <EditableText label="Signes" value={it.situation} onSave={(v) => patchItem(it.id, { situation: v.slice(0, 600) })} placeholder="Comment le reconnaître" className="text-[14px] text-ink-secondary" multiline />
                    </div>
                    <button type="button" aria-label={`Supprimer ${it.title}`} onClick={() => removeItem(it.id)} className="rounded-full p-1.5 text-ink-secondary hover:bg-black/5 hover:text-danger"><Trash2 size={15} /></button>
                  </div>
                  <div className="mt-3 rounded-2xl bg-canvas p-1"><EditableText label="Étapes" value={it.body} onSave={(v) => v.trim() && patchItem(it.id, { body: v.trim().slice(0, 3000) })} className="text-[15px]" multiline /></div>
                  <div className="mt-3 flex items-center gap-2"><span className="caption">Qui décide :</span><div className="min-w-[200px]"><EditableText label="Responsable" value={it.owner} onSave={(v) => patchItem(it.id, { owner: v.trim().slice(0, 120) })} placeholder="Nom ou rôle" className="text-[14px]" /></div></div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}

      {section === "interactions" && (
        <div className="mt-6">
          <div className="grid gap-3 sm:grid-cols-3">
            {INTERACTION_TEMPS.map((t) => (
              <button key={t} type="button" aria-pressed={tempFilter === t} onClick={() => setTempFilter(tempFilter === t ? "all" : t)} className={`rounded-2xl border p-4 text-left transition ${tempFilter === t ? "border-accent bg-accent-soft" : "border-black/10 bg-white hover:border-black/25"}`}>
                <p className="num text-[26px] font-semibold leading-none">{ints.filter((i) => i.temperature === t && i.status !== "conclue" && i.status !== "abandonnee").length}</p>
                <p className="mt-1 text-[14px] font-semibold">{TEMP_LABEL[t]}</p><p className="caption">{TEMP_HINT[t]}</p>
              </button>
            ))}
          </div>

          {adding && (
            <div className="card-flat mt-5 space-y-4">
              <h2 className="section-title">Nouvelle interaction</h2>
              <div className="grid gap-4 md:grid-cols-3">
                <div><label className="label" htmlFor="i-person">Personne ou compte</label><input id="i-person" className="input" maxLength={120} value={iform.person} onChange={(e) => setIform({ ...iform, person: e.target.value })} /></div>
                <div><label className="label" htmlFor="i-net">Réseau</label><select id="i-net" className="input" value={iform.network} onChange={(e) => setIform({ ...iform, network: e.target.value })}>{NETWORKS.map((n) => <option key={n}>{n}</option>)}</select></div>
                <div><label className="label" htmlFor="i-temp">Température</label><select id="i-temp" className="input" value={iform.temperature} onChange={(e) => setIform({ ...iform, temperature: e.target.value as InteractionTemp })}>{INTERACTION_TEMPS.map((t) => <option key={t} value={t}>{TEMP_LABEL[t]} — {TEMP_HINT[t]}</option>)}</select></div>
              </div>
              <div><label className="label" htmlFor="i-note">Ce qui s&apos;est passé</label><textarea id="i-note" className="input min-h-[80px]" maxLength={1000} value={iform.note} onChange={(e) => setIform({ ...iform, note: e.target.value })} /></div>
              <div className="grid gap-4 md:grid-cols-2">
                <div><label className="label" htmlFor="i-next">Prochaine étape</label><input id="i-next" className="input" maxLength={400} value={iform.next_step} onChange={(e) => setIform({ ...iform, next_step: e.target.value })} /></div>
                <div><label className="label" htmlFor="i-due">Pour le</label><input id="i-due" type="date" className="input" value={iform.due_date} onChange={(e) => setIform({ ...iform, due_date: e.target.value })} /></div>
              </div>
              <div className="flex gap-3"><button type="button" className="btn-primary" onClick={addInteraction}>Ajouter</button><button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Annuler</button></div>
            </div>
          )}

          {shownInts.length === 0 ? (
            <div className="mt-6"><EmptyState illustration="chat" title="Aucune interaction suivie" text="Notez ici les personnes qui commentent, écrivent ou partagent : une interaction chaude oubliée est une occasion perdue." /></div>
          ) : (
            <ul className="mt-5 space-y-3">
              {shownInts.map((i) => (
                <li key={i.id} className="card-flat !p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[17px] font-semibold">{i.person}</span>
                    {i.network && <span className="chip">{i.network}</span>}
                    <select aria-label={`Température de ${i.person}`} className={`rounded-pill border-0 px-3 py-1 text-[13px] font-semibold ${TEMP_CLS[i.temperature]}`} value={i.temperature} onChange={(e) => patchInt(i.id, { temperature: e.target.value as InteractionTemp })}>{INTERACTION_TEMPS.map((t) => <option key={t} value={t}>{TEMP_LABEL[t]}</option>)}</select>
                    <select aria-label={`Statut de ${i.person}`} className="rounded-pill border border-black/10 bg-white px-3 py-1 text-[13px]" value={i.status} onChange={(e) => patchInt(i.id, { status: e.target.value as InteractionStatus })}>{INTERACTION_STATUSES.map((s) => <option key={s} value={s}>{INTERACTION_STATUS_LABEL[s]}</option>)}</select>
                    {late(i) && <span className="rounded-pill bg-danger/15 px-2.5 py-0.5 text-[12px] font-semibold text-danger">En retard</span>}
                    <button type="button" aria-label={`Supprimer ${i.person}`} onClick={() => removeInt(i.id)} className="ml-auto rounded-full p-1.5 text-ink-secondary hover:bg-black/5 hover:text-danger"><Trash2 size={15} /></button>
                  </div>
                  <EditableText label="Notes" value={i.note} onSave={(v) => patchInt(i.id, { note: v.slice(0, 1000) })} placeholder="Ce qui s'est passé" className="mt-1 text-[15px]" multiline />
                  <div className="mt-1 grid gap-2 md:grid-cols-[1fr_auto] md:items-center">
                    <div className="flex items-center gap-2"><span className="caption shrink-0">Prochaine étape :</span><EditableText label="Prochaine étape" value={i.next_step} onSave={(v) => patchInt(i.id, { next_step: v.slice(0, 400) })} placeholder="À définir" className="text-[14px]" /></div>
                    <input aria-label={`Échéance de ${i.person}`} type="date" className="input !w-auto !py-1 text-[14px]" value={i.due_date ?? ""} onChange={(e) => patchInt(i.id, { due_date: e.target.value || null })} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
