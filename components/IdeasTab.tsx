"use client";

import { CalendarPlus, Check, ExternalLink, Plus, Sparkles, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { callGenerate } from "@/lib/api";
import { cleanUrl } from "@/lib/brandInfo";
import { createClient } from "@/lib/supabase/client";
import { IDEA_SOURCES, IDEA_SOURCE_LABEL, IDEA_STATUSES, IDEA_STATUS_LABEL, type IdeaSource, type IdeaStatus } from "@/lib/strategy/schemas";
import EditableText from "./EditableText";
import EmptyState from "./EmptyState";
import GenerateError from "./GenerateError";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

export type Idea = {
  id: string; pillar_id: string | null; persona_id: string | null; title: string; notes: string; source: IdeaSource; url: string | null; competitor: string | null;
  subtheme: string | null; format: string | null; networks: string[]; status: IdeaStatus; created_at: string;
};
const COLUMNS = "id, pillar_id, persona_id, title, notes, source, url, competitor, subtheme, format, networks, status, created_at";
const NETWORKS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "WhatsApp", "Site web"];
const FORMATS = ["Reel", "Carrousel", "Photo", "Story", "Live", "Vidéo courte", "Article"];
const STATUS_CLS: Record<IdeaStatus, string> = { a_trier: "bg-black/[0.07] text-ink", retenue: "bg-accent-soft text-accent", produite: "bg-success/20 text-ink", ecartee: "bg-danger/10 text-danger" };
const today = () => new Date().toISOString().slice(0, 10);

export default function IdeasTab({ brandId, initial, pillars, initialPillar }: { brandId: string; initial: Idea[]; pillars: { id: string; name: string }[]; initialPillar: string }) {
  const supabase = createClient();
  const [ideas, setIdeas] = useState<Idea[]>(initial);
  const [pillarFilter, setPillarFilter] = useState(initialPillar);
  const [statusFilter, setStatusFilter] = useState<IdeaStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<IdeaSource | "all">("all");
  const [adding, setAdding] = useState(false);
  const [genPillar, setGenPillar] = useState(initialPillar || pillars[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [planning, setPlanning] = useState<string | null>(null);
  const [plan, setPlan] = useState({ date: today(), network: "Facebook" });
  const [form, setForm] = useState({ title: "", source: "idee" as IdeaSource, pillar_id: "", format: "", networks: [] as string[], url: "", competitor: "", notes: "" });

  const pillarName = (id: string | null) => pillars.find((p) => p.id === id)?.name ?? null;
  const shown = useMemo(() => ideas.filter((i) => (!pillarFilter || i.pillar_id === pillarFilter) && (statusFilter === "all" || i.status === statusFilter) && (sourceFilter === "all" || i.source === sourceFilter)), [ideas, pillarFilter, statusFilter, sourceFilter]);
  const count = (s: IdeaStatus) => ideas.filter((i) => i.status === s).length;

  async function reload() {
    const { data } = await supabase.from("content_ideas").select(COLUMNS).eq("brand_profile_id", brandId).order("created_at", { ascending: false }).limit(500);
    setIdeas((data as Idea[]) ?? []);
  }

  async function generate() {
    if (!genPillar) return;
    setLoading(true);
    setError(null);
    const res = await callGenerate({ type: "ideas", brand_profile_id: brandId, pillar_id: genPillar, count: 6 });
    if (!res.ok) { setLoading(false); return setError(res.error); }
    await reload();
    setLoading(false);
  }

  async function create() {
    setError(null);
    if (!form.title.trim()) return setError("Écrivez l'idée en quelques mots.");
    const url = cleanUrl(form.url);
    if (url === "invalid") return setError("L'adresse du lien n'est pas valide (exemple : exemple.org/page).");
    setSave("saving");
    const row = { brand_profile_id: brandId, title: form.title.trim().slice(0, 300), source: form.source, pillar_id: form.pillar_id || null, format: form.format || null, networks: form.networks, url, competitor: form.source === "benchmark" ? form.competitor.trim().slice(0, 120) || null : null, notes: form.notes.trim().slice(0, 2000), status: "a_trier" };
    const { data, error: err } = await supabase.from("content_ideas").insert(row).select(COLUMNS).single();
    if (err || !data) { setSave("error"); return setError(err?.code === "42501" ? "La banque d'idées est pleine (1 000 idées). Supprimez-en pour en ajouter." : "L'idée n'a pas pu être enregistrée."); }
    setIdeas((is) => [data as Idea, ...is]);
    setForm({ title: "", source: "idee", pillar_id: form.pillar_id, format: "", networks: [], url: "", competitor: "", notes: "" });
    setSave("saved");
  }

  async function patch(id: string, p: Partial<Idea>) {
    setIdeas((is) => is.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("content_ideas").update(p).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer cette idée ?")) return;
    setSave("saving");
    const { error: err } = await supabase.from("content_ideas").delete().eq("id", id);
    if (err) return setSave("error");
    setIdeas((is) => is.filter((i) => i.id !== id));
    setSave("saved");
  }

  async function schedule(i: Idea) {
    setError(null);
    setSave("saving");
    const { error: err } = await supabase.from("posts").insert({ brand_profile_id: brandId, channel: plan.network, scheduled_date: plan.date, idea: i.title, hook: "", caption: "", pillar: pillarName(i.pillar_id), format: i.format, status: "brouillon", idea_id: i.id });
    if (err) { setSave("error"); return setError(err.code === "42501" ? "Planifier une publication demande le palier Pro. L'idée reste dans la banque." : "La publication n'a pas pu être créée."); }
    await patch(i.id, { status: "produite" });
    setPlanning(null);
  }

  return (
    <section className="rise">
      <PageHeader tab="ideas">
        <SaveIndicator state={save} />
        <button type="button" className="btn-secondary" onClick={() => setAdding((v) => !v)}><Plus size={16} />Ajouter une idée</button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-4">
        {IDEA_STATUSES.map((s) => (
          <button key={s} type="button" aria-pressed={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)} className={`rounded-2xl border p-4 text-left transition ${statusFilter === s ? "border-accent bg-accent-soft" : "border-black/10 bg-white hover:border-black/25"}`}>
            <p className="num text-[26px] font-semibold leading-none">{count(s)}</p><p className="caption mt-1">{IDEA_STATUS_LABEL[s]}</p>
          </button>
        ))}
      </div>

      <div className="card-flat mt-5 flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="label" htmlFor="gen-pillar">Générer des idées avec l&apos;IA pour le pilier</label>
          {pillars.length === 0 ? <p className="text-[15px] text-ink-secondary">Il faut d&apos;abord des piliers. <Link href="/dashboard/pillars" className="text-accent">Construire les piliers</Link></p> : (
            <select id="gen-pillar" className="input" value={genPillar} onChange={(e) => setGenPillar(e.target.value)}>{pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          )}
        </div>
        <button type="button" className="btn-primary" onClick={generate} disabled={loading || !genPillar}><Sparkles size={16} />{loading ? "Génération…" : "Générer 6 idées"}</button>
      </div>
      {error && <GenerateError message={error} onRetry={() => setError(null)} />}

      {adding && (
        <div className="card-flat mt-5 space-y-4">
          <h2 className="section-title">Nouvelle idée</h2>
          <div><label className="label" htmlFor="idea-title">L&apos;idée</label><input id="idea-title" className="input" maxLength={300} placeholder="Ex. : visite de la cuisine pendant la préparation du midi" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div><label className="label" htmlFor="idea-source">D&apos;où vient-elle ?</label><select id="idea-source" className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value as IdeaSource })}>{IDEA_SOURCES.filter((s) => s !== "ia").map((s) => <option key={s} value={s}>{IDEA_SOURCE_LABEL[s]}</option>)}</select></div>
            <div><label className="label" htmlFor="idea-pillar">Pilier</label><select id="idea-pillar" className="input" value={form.pillar_id} onChange={(e) => setForm({ ...form, pillar_id: e.target.value })}><option value="">Pas encore choisi</option>{pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
            <div><label className="label" htmlFor="idea-format">Format</label><select id="idea-format" className="input" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}><option value="">À définir</option>{FORMATS.map((f) => <option key={f}>{f}</option>)}</select></div>
          </div>
          {(form.source === "benchmark" || form.source === "veille") && (
            <div className="grid gap-4 md:grid-cols-2">
              {form.source === "benchmark" && <div><label className="label" htmlFor="idea-comp">Concurrent ou référence</label><input id="idea-comp" className="input" maxLength={120} value={form.competitor} onChange={(e) => setForm({ ...form, competitor: e.target.value })} /></div>}
              <div><label className="label" htmlFor="idea-url">Lien</label><input id="idea-url" className="input" placeholder="Adresse de la publication ou de l'article" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
            </div>
          )}
          <div><span className="label">Réseaux visés</span><div className="flex flex-wrap gap-2">{NETWORKS.map((n) => { const on = form.networks.includes(n); return <button key={n} type="button" aria-pressed={on} onClick={() => setForm({ ...form, networks: on ? form.networks.filter((x) => x !== n) : [...form.networks, n] })} className={`rounded-pill border px-3 py-1 text-[13px] font-medium ${on ? "border-accent bg-accent text-white" : "border-black/10 bg-white text-ink-secondary"}`}>{n}</button>; })}</div></div>
          <div><label className="label" htmlFor="idea-notes">Notes <span className="font-normal text-ink-secondary">(facultatif)</span></label><textarea id="idea-notes" rows={2} className="input" maxLength={2000} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          <div className="flex gap-3"><button type="button" className="btn-primary" onClick={create}>Ajouter à la banque</button><button type="button" className="btn-secondary" onClick={() => setAdding(false)}>Fermer</button></div>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <select aria-label="Filtrer par pilier" className="input !w-auto" value={pillarFilter} onChange={(e) => setPillarFilter(e.target.value)}><option value="">Tous les piliers</option>{pillars.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        <select aria-label="Filtrer par origine" className="input !w-auto" value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value as IdeaSource | "all")}><option value="all">Toutes les origines</option>{IDEA_SOURCES.map((s) => <option key={s} value={s}>{IDEA_SOURCE_LABEL[s]}</option>)}</select>
        {(pillarFilter || statusFilter !== "all" || sourceFilter !== "all") && <button type="button" className="btn-ghost text-accent" onClick={() => { setPillarFilter(""); setStatusFilter("all"); setSourceFilter("all"); }}>Tout afficher</button>}
        <span className="caption ml-auto">{shown.length} idée{shown.length > 1 ? "s" : ""}</span>
      </div>

      {shown.length === 0 ? (
        <div className="mt-4"><EmptyState illustration="start" title={ideas.length ? "Aucune idée avec ces filtres" : "Votre banque d'idées est vide"} text={ideas.length ? undefined : "Notez ici chaque idée dès qu'elle vous vient : idée brute, tendance repérée, publication d'un concurrent, retour du terrain. L'IA peut aussi en proposer à partir de vos piliers."} /></div>
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
          {shown.map((i) => (
            <li key={i.id} className={`card-flat ${i.status === "ecartee" ? "opacity-60" : ""}`}>
              <div className="flex flex-wrap items-center gap-1.5">
                <span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_CLS[i.status]}`}>{IDEA_STATUS_LABEL[i.status]}</span>
                <span className="rounded-pill bg-canvas px-2.5 py-0.5 text-[12px] text-ink-secondary">{IDEA_SOURCE_LABEL[i.source]}</span>
                {pillarName(i.pillar_id) && <span className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-[12px] font-medium text-accent">{pillarName(i.pillar_id)}</span>}
                {i.format && <span className="rounded-pill bg-canvas px-2.5 py-0.5 text-[12px] text-ink-secondary">{i.format}</span>}
                {i.networks.map((n) => <span key={n} className="rounded-pill bg-canvas px-2.5 py-0.5 text-[12px] text-ink-secondary">{n}</span>)}
              </div>
              <EditableText multiline label="Idée" className="mt-2 text-[16px] font-semibold leading-snug" value={i.title} onSave={(v) => v.trim() && patch(i.id, { title: v.trim().slice(0, 300) })} />
              {i.subtheme && <p className="caption px-2">Sous-thème : {i.subtheme}</p>}
              <EditableText multiline label="Notes" className="text-[14px] text-ink-secondary" placeholder="Ajouter une note" value={i.notes} onSave={(v) => patch(i.id, { notes: v.slice(0, 2000) })} />
              {(i.competitor || i.url) && (
                <p className="mt-1 px-2 text-[13px] text-ink-secondary">{i.competitor && <span className="mr-2 font-medium text-ink">{i.competitor}</span>}{i.url && <a href={i.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-accent">Voir le lien <ExternalLink size={12} /></a>}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {i.status === "a_trier" && <><button type="button" className="btn-secondary !py-1.5 text-[14px]" onClick={() => patch(i.id, { status: "retenue" })}><Check size={15} />Retenir</button><button type="button" className="btn-ghost !py-1.5 text-[14px]" onClick={() => patch(i.id, { status: "ecartee" })}><X size={15} />Écarter</button></>}
                {i.status === "retenue" && <button type="button" className="btn-primary !py-1.5 text-[14px]" onClick={() => { setPlanning(planning === i.id ? null : i.id); setPlan({ date: today(), network: i.networks[0] ?? "Facebook" }); }}><CalendarPlus size={15} />Planifier</button>}
                {(i.status === "ecartee" || i.status === "produite") && <button type="button" className="btn-ghost !py-1.5 text-[14px]" onClick={() => patch(i.id, { status: "a_trier" })}>Remettre à trier</button>}
                <button type="button" className="btn-ghost ml-auto !px-2 text-ink-secondary hover:text-danger" aria-label="Supprimer l'idée" onClick={() => remove(i.id)}><Trash2 size={15} /></button>
              </div>
              {planning === i.id && (
                <div className="mt-3 flex flex-wrap items-end gap-2 rounded-2xl bg-canvas p-3">
                  <div><label className="caption block px-1" htmlFor={`d-${i.id}`}>Date</label><input id={`d-${i.id}`} type="date" className="input !py-1.5" value={plan.date} onChange={(e) => setPlan({ ...plan, date: e.target.value })} /></div>
                  <div><label className="caption block px-1" htmlFor={`n-${i.id}`}>Réseau</label><select id={`n-${i.id}`} className="input !py-1.5" value={plan.network} onChange={(e) => setPlan({ ...plan, network: e.target.value })}>{NETWORKS.map((n) => <option key={n}>{n}</option>)}</select></div>
                  <button type="button" className="btn-primary !py-1.5" onClick={() => schedule(i)}>Créer la publication</button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
