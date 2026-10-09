"use client";

import { CalendarDays, ChevronLeft, ChevronRight, ClipboardCopy, Check, List, Plus, Sparkles, Trash2 } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { callGenerate } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { dayTitle, groupByDate, monthGrid, monthTitle, nextPostStatus, POST_STATUS_LABEL, postCopyText, toIso, type Post, type PostStatus } from "@/lib/posts";
import EditableText from "./EditableText";
import EmptyState from "./EmptyState";
import GenerateError from "./GenerateError";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import { notifyProgress } from "@/lib/progressEvents";

export type WeekOption = { id: string; channel: string; week: number; theme: string };
const COLUMNS = "id, brand_profile_id, editorial_entry_id, channel, scheduled_date, caption, visual_idea, hashtags, call_to_action, status";
const STATUS_CLS: Record<PostStatus, string> = { brouillon: "bg-black/10 text-ink", pret: "bg-warning/25 text-ink", publie: "bg-success/25 text-ink" };
const DOT_CLS: Record<PostStatus, string> = { brouillon: "bg-black/30", pret: "bg-warning", publie: "bg-success" };

export default function PostsTab({ brandId, weeks, initialPosts, channels }: { brandId: string; weeks: WeekOption[]; initialPosts: Post[]; channels: string[] }) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const today = toIso(new Date());
  const first = initialPosts.find((p) => p.scheduled_date && p.scheduled_date >= today)?.scheduled_date ?? today;
  const [cursor, setCursor] = useState({ y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) - 1 });
  const [view, setView] = useState<"calendar" | "list">("calendar");
  const [channel, setChannel] = useState<string>("");
  const [day, setDay] = useState<string | null>(null);
  const [weekId, setWeekId] = useState(weeks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [copied, setCopied] = useState<string | null>(null);

  const visible = useMemo(() => posts.filter((p) => !channel || p.channel === channel), [posts, channel]);
  const byDay = useMemo(() => groupByDate(visible), [visible]);
  const grid = monthGrid(cursor.y, cursor.m);
  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`;
  const shown = (day ? visible.filter((p) => p.scheduled_date === day) : view === "calendar" ? visible.filter((p) => p.scheduled_date?.startsWith(monthPrefix)) : visible)
    .slice().sort((a, b) => (a.scheduled_date ?? "9").localeCompare(b.scheduled_date ?? "9"));

  async function reload() {
    const { data } = await supabase.from("posts").select(COLUMNS).eq("brand_profile_id", brandId).order("scheduled_date", { ascending: true });
    setPosts((data as Post[]) ?? []);
  }

  async function generate() {
    if (!weekId) return;
    const w = weeks.find((x) => x.id === weekId);
    if (posts.some((p) => p.editorial_entry_id === weekId && p.status === "brouillon") && !window.confirm("Les brouillons de cette semaine seront remplacés (les publications « Prêt » et « Publié » restent). Continuer ?")) return;
    setBusy(true);
    setError(null);
    const res = await callGenerate({ type: "posts_week", entry_id: weekId });
    if (!res.ok) { setBusy(false); return setError(res.error); }
    await reload();
    setBusy(false);
    setDay(null);
    notifyProgress();
    const date = (await supabase.from("posts").select("scheduled_date").eq("editorial_entry_id", w?.id ?? "").order("scheduled_date").limit(1)).data?.[0]?.scheduled_date;
    if (date) setCursor({ y: Number(date.slice(0, 4)), m: Number(date.slice(5, 7)) - 1 });
  }

  async function patch(id: string, p: Partial<Post>) {
    setPosts((ps) => ps.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("posts").update(p).eq("id", id);
    setSave(err ? "error" : "saved");
    if (!err && p.status) notifyProgress();
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer cette publication ?")) return;
    setPosts((ps) => ps.filter((x) => x.id !== id));
    setSave("saving");
    const { error: err } = await supabase.from("posts").delete().eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function addManual() {
    setSave("saving");
    const { data, error: err } = await supabase
      .from("posts")
      .insert({ brand_profile_id: brandId, channel: channel || channels[0] || null, scheduled_date: day ?? today, caption: "Votre texte ici", status: "brouillon" })
      .select(COLUMNS)
      .single();
    if (err || !data) return setSave("error");
    setPosts((ps) => [...ps, data as Post]);
    setSave("saved");
  }

  async function copy(p: Post) {
    try { await navigator.clipboard.writeText(postCopyText(p)); setCopied(p.id); setTimeout(() => setCopied((c) => (c === p.id ? null : c)), 2000); } catch { /* presse-papiers indisponible */ }
  }

  const move = (delta: number) => { setDay(null); setCursor(({ y, m }) => { const n = new Date(Date.UTC(y, m + delta, 1)); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; }); };

  if (weeks.length === 0 && posts.length === 0) {
    return (
      <section>
        <PageHeader tab="posts" />
        <EmptyState illustration="calendar" title="Planifiez d'abord vos semaines" text="Les publications sont rédigées à partir de la ligne éditoriale : ajoutez un canal et générez ses semaines.">
          <Link href="/dashboard/editorial" className="btn-primary">Aller à la ligne éditoriale</Link>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="rise">
      <PageHeader tab="posts"><SaveIndicator state={save} /></PageHeader>

      {weeks.length > 0 && (
        <div className="card-flat flex flex-wrap items-end gap-4">
          <div className="min-w-[240px] flex-1">
            <label className="label" htmlFor="week">Rédiger les publications de…</label>
            <select id="week" className="input" value={weekId} onChange={(e) => setWeekId(e.target.value)}>
              {weeks.map((w) => (<option key={w.id} value={w.id}>{w.channel} · semaine {w.week}{w.theme ? ` : ${w.theme}` : ""}</option>))}
            </select>
          </div>
          <button type="button" className="btn-primary" onClick={generate} disabled={busy}><Sparkles size={17} />{busy ? "Rédaction en cours…" : "Rédiger cette semaine"}</button>
        </div>
      )}
      {error && <GenerateError message={error} onRetry={generate} />}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Canal">
          {["", ...channels].map((c) => (
            <button key={c || "all"} type="button" aria-pressed={channel === c} onClick={() => { setChannel(c); setDay(null); }}
              className={`rounded-pill px-4 py-1.5 text-[14px] font-medium transition ${channel === c ? "bg-night text-white shadow-card" : "bg-white text-ink-secondary shadow-card hover:text-ink"}`}>{c || "Tous les canaux"}</button>
          ))}
        </div>
        <div className="flex rounded-pill bg-white p-1 shadow-card" role="group" aria-label="Affichage">
          {([["calendar", "Calendrier", CalendarDays], ["list", "Liste", List]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => { setView(v); setDay(null); }} className={`flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-[14px] font-medium ${view === v ? "bg-accent text-white" : "text-ink-secondary"}`}><Icon size={15} />{label}</button>
          ))}
        </div>
      </div>

      {view === "calendar" && (
        <div className="card-flat mt-4 !p-4 sm:!p-6">
          <div className="mb-3 flex items-center justify-between">
            <button type="button" className="btn-ghost !px-2" aria-label="Mois précédent" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
            <h2 className="text-[20px] capitalize">{monthTitle(cursor.y, cursor.m)}</h2>
            <button type="button" className="btn-ghost !px-2" aria-label="Mois suivant" onClick={() => move(1)}><ChevronRight size={20} /></button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center caption font-semibold uppercase">{["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => <div key={d}>{d}</div>)}</div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {grid.flat().map((c) => {
              const list = byDay.get(c.iso) ?? [];
              const selected = day === c.iso;
              return (
                <button key={c.iso} type="button" aria-label={`${dayTitle(c.iso)} : ${list.length} publication${list.length > 1 ? "s" : ""}`} aria-pressed={selected} onClick={() => setDay(selected ? null : c.iso)}
                  className={`flex min-h-[64px] flex-col items-stretch rounded-xl border p-1.5 text-left transition sm:min-h-[84px] ${selected ? "border-accent bg-accent-soft" : "border-black/5 bg-white hover:border-black/20"} ${c.inMonth ? "" : "opacity-40"} ${c.iso === today ? "ring-2 ring-accent/40" : ""}`}>
                  <span className="text-[13px] font-semibold">{Number(c.iso.slice(8))}</span>
                  <span className="mt-auto flex flex-wrap gap-1">
                    {list.slice(0, 4).map((p) => (<span key={p.id} aria-hidden className={`h-2 w-2 rounded-full ${DOT_CLS[p.status]}`} />))}
                    {list.length > 0 && <span className="hidden truncate text-[11px] text-ink-secondary sm:block">{list.length} post{list.length > 1 ? "s" : ""}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="caption mt-3 flex flex-wrap gap-x-4"><span>● gris : brouillon</span><span className="text-warning">● orange : prêt</span><span className="text-success">● vert : publié</span></p>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[20px]">{day ? <span className="capitalize">{dayTitle(day)}</span> : view === "calendar" ? <span className="capitalize">Publications de {monthTitle(cursor.y, cursor.m)}</span> : "Toutes les publications"}</h2>
        <button type="button" className="btn-secondary" onClick={addManual}><Plus size={16} />Ajouter une publication</button>
      </div>

      {shown.length === 0 ? (
        <p className="mt-3 text-ink-secondary">Aucune publication ici. Rédigez une semaine ci-dessus ou ajoutez-en une à la main.</p>
      ) : (
        <ul className="mt-4 grid gap-4 lg:grid-cols-2">
          {shown.map((p) => (
            <li key={p.id} className="card relative overflow-hidden !pl-7">
              <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${DOT_CLS[p.status]}`} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  {p.channel && <span className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-[12px] font-medium text-accent">{p.channel}</span>}
                  <input type="date" aria-label="Date de publication" className="rounded-lg border border-black/10 bg-white px-2 py-1 text-[14px]" value={p.scheduled_date ?? ""} onChange={(e) => patch(p.id, { scheduled_date: e.target.value || null })} />
                </div>
                <button type="button" aria-label={`Statut : ${POST_STATUS_LABEL[p.status]}. Cliquer pour changer`} className={`rounded-pill px-3 py-1 text-[13px] font-medium ${STATUS_CLS[p.status]}`} onClick={() => patch(p.id, { status: nextPostStatus(p.status) })}>{POST_STATUS_LABEL[p.status]}</button>
              </div>
              <div className="mt-2 space-y-1">
                <EditableText multiline label="Légende" className="text-[15px] leading-relaxed" value={p.caption} onSave={(v) => patch(p.id, { caption: v })} />
                <p className="caption px-2 pt-1 font-semibold uppercase tracking-[0.08em]">Idée de visuel</p>
                <EditableText multiline label="Idée de visuel" className="text-[14px] text-ink-secondary" placeholder="Décrivez le visuel" value={p.visual_idea} onSave={(v) => patch(p.id, { visual_idea: v })} />
                <p className="caption px-2 pt-1 font-semibold uppercase tracking-[0.08em]">Appel à l&apos;action et hashtags</p>
                <EditableText multiline label="Appel à l'action" className="text-[14px]" placeholder="Appel à l'action" value={p.call_to_action} onSave={(v) => patch(p.id, { call_to_action: v })} />
                <EditableText label="Hashtags" className="text-[14px] text-accent" placeholder="#hashtags" value={p.hashtags} onSave={(v) => patch(p.id, { hashtags: v })} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" className="btn-secondary" onClick={() => copy(p)}>{copied === p.id ? <Check size={16} /> : <ClipboardCopy size={16} />}{copied === p.id ? "Copié" : "Copier le texte"}</button>
                <button type="button" className="btn-ghost text-danger" onClick={() => remove(p.id)}><Trash2 size={16} />Supprimer</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
