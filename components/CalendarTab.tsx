"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Columns3, List, Plus, Send, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { callGenerate } from "@/lib/api";
import { createClient } from "@/lib/supabase/client";
import { DOT_CLS, POST_STATUSES, POST_STATUS_LABEL, STATUS_CLS, dayTitle, groupByDate, monthGrid, monthTitle, postTitle, toIso, type Post, type PostStatus } from "@/lib/posts";
import { notifyProgress } from "@/lib/progressEvents";
import Overlay from "./Overlay";
import PostPanel from "./calendar/PostPanel";
import ValidationPanel from "./calendar/ValidationPanel";
import EmptyState from "./EmptyState";
import GenerateError from "./GenerateError";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

export type WeekOption = { id: string; channel: string; week: number; theme: string };
const COLUMNS = "id, brand_profile_id, editorial_entry_id, channel, scheduled_date, caption, visual_idea, hashtags, call_to_action, status, idea, hook, pillar, format, assignee, design_link, review_note, asset_id";
const LIST_STEP = 60;
type View = "mois" | "kanban" | "liste";

function Chip({ p, onOpen }: { p: Post; onOpen: (id: string) => void }) {
  return (
    <button type="button" onClick={() => onOpen(p.id)} className="w-full rounded-xl border border-black/10 bg-white p-3 text-left shadow-card transition hover:border-black/25">
      <span className="flex flex-wrap items-center gap-1.5">
        {p.channel && <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">{p.channel}</span>}
        {p.format && <span className="rounded-pill bg-canvas px-2 py-0.5 text-[11px] text-ink-secondary">{p.format}</span>}
        <span className="num ml-auto text-[12px] text-ink-secondary">{p.scheduled_date ? p.scheduled_date.slice(8) + "/" + p.scheduled_date.slice(5, 7) : "—"}</span>
      </span>
      <span className="mt-1.5 block text-[14px] leading-snug">{postTitle(p)}</span>
      {p.review_note && p.status === "brouillon" && <span className="mt-1.5 block rounded-lg bg-warning/15 px-2 py-1 text-[12px]">↩ Retour : {p.review_note.slice(0, 70)}</span>}
    </button>
  );
}

export default function CalendarTab({ brandId, weeks, initialPosts, channels, pillars }: { brandId: string; weeks: WeekOption[]; initialPosts: Post[]; channels: string[]; pillars: string[] }) {
  const supabase = createClient();
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const today = toIso(new Date());
  const first = initialPosts.find((p) => p.scheduled_date && p.scheduled_date >= today)?.scheduled_date ?? today;
  const [cursor, setCursor] = useState({ y: Number(first.slice(0, 4)), m: Number(first.slice(5, 7)) - 1 });
  const [view, setView] = useState<View>("mois");
  const [channel, setChannel] = useState("");
  const [statusFilter, setStatusFilter] = useState<PostStatus | "all">("all");
  const [pillar, setPillar] = useState("");
  const [day, setDay] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [weekId, setWeekId] = useState(weeks[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [writing, setWriting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [limit, setLimit] = useState(LIST_STEP);
  const [dragId, setDragId] = useState<string | null>(null);

  const filtered = useMemo(() => posts.filter((p) => (!channel || p.channel === channel) && (statusFilter === "all" || p.status === statusFilter) && (!pillar || p.pillar === pillar)), [posts, channel, statusFilter, pillar]);
  const byDay = useMemo(() => groupByDate(filtered), [filtered]);
  const sorted = useMemo(() => filtered.slice().sort((a, b) => (a.scheduled_date ?? "9").localeCompare(b.scheduled_date ?? "9")), [filtered]);
  const grid = monthGrid(cursor.y, cursor.m);
  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, "0")}`;
  const counts = useMemo(() => Object.fromEntries(POST_STATUSES.map((s) => [s, posts.filter((p) => p.status === s).length])) as Record<PostStatus, number>, [posts]);
  const open = posts.find((p) => p.id === openId) ?? null;
  const shownDay = day ? sorted.filter((p) => p.scheduled_date === day) : sorted.filter((p) => p.scheduled_date?.startsWith(monthPrefix));
  const upcomingFirst = [...sorted.filter((p) => (p.scheduled_date ?? "9") >= today), ...sorted.filter((p) => (p.scheduled_date ?? "9") < today)];

  async function reload() {
    const { data } = await supabase.from("posts").select(COLUMNS).eq("brand_profile_id", brandId).order("scheduled_date", { ascending: true });
    setPosts((data as Post[]) ?? []);
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
    setSave("saving");
    const { error: err } = await supabase.from("posts").delete().eq("id", id);
    if (err) return setSave("error");
    setPosts((ps) => ps.filter((x) => x.id !== id));
    setOpenId(null);
    setSave("saved");
  }

  async function add(status: PostStatus = "brouillon") {
    setSave("saving");
    const { data, error: err } = await supabase.from("posts").insert({ brand_profile_id: brandId, channel: channel || channels[0] || null, scheduled_date: day ?? today, caption: "", status }).select(COLUMNS).single();
    if (err || !data) return setSave("error");
    setPosts((ps) => [...ps, data as Post]);
    setSave("saved");
    setOpenId((data as Post).id);
  }

  async function write(p: Post) {
    setWriting(p.id);
    setError(null);
    const res = await callGenerate({ type: "post_write", post_id: p.id });
    if (!res.ok) { setWriting(null); return setError(res.error); }
    const { data } = await supabase.from("posts").select(COLUMNS).eq("id", p.id).single();
    if (data) setPosts((ps) => ps.map((x) => (x.id === p.id ? (data as Post) : x)));
    setWriting(null);
    notifyProgress();
  }

  async function generateWeek() {
    if (!weekId) return;
    if (posts.some((p) => p.editorial_entry_id === weekId && p.status === "brouillon" && p.caption) && !window.confirm("Les légendes déjà rédigées en brouillon pour cette semaine seront remplacées. Continuer ?")) return;
    setBusy(true);
    setError(null);
    const res = await callGenerate({ type: "posts_week", entry_id: weekId });
    if (!res.ok) { setBusy(false); return setError(res.error); }
    await reload();
    setBusy(false);
    notifyProgress();
  }

  const move = (delta: number) => { setDay(null); setCursor(({ y, m }) => { const n = new Date(Date.UTC(y, m + delta, 1)); return { y: n.getUTCFullYear(), m: n.getUTCMonth() }; }); };

  if (weeks.length === 0 && posts.length === 0) {
    return (
      <section>
        <PageHeader tab="posts" />
        <EmptyState illustration="calendar" title="Planifiez d'abord vos semaines" text="Le calendrier se remplit à partir de la ligne éditoriale : construisez le plan, ou ajoutez un canal et générez ses semaines." >
          <Link href="/dashboard/plan" className="btn-primary">Construire le plan</Link>
          <Link href="/dashboard/editorial" className="btn-secondary">Ligne éditoriale</Link>
          <button type="button" className="btn-secondary" onClick={() => add()}><Plus size={16} />Ajouter une publication</button>
        </EmptyState>
      </section>
    );
  }

  return (
    <section className="rise">
      <PageHeader tab="posts">
        <SaveIndicator state={save} />
        <button type="button" className="btn-secondary" onClick={() => setValidating(true)}><Send size={16} />Envoyer pour validation{counts.a_valider ? ` (${counts.a_valider})` : ""}</button>
        <button type="button" className="btn-primary" onClick={() => add()}><Plus size={16} />Nouvelle publication</button>
      </PageHeader>

      <div className="grid gap-3 sm:grid-cols-4">
        {POST_STATUSES.map((s) => (
          <button key={s} type="button" aria-pressed={statusFilter === s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)} className={`flex items-center gap-3 rounded-2xl border p-4 text-left transition ${statusFilter === s ? "border-accent bg-accent-soft" : "border-black/10 bg-white hover:border-black/25"}`}>
            <span aria-hidden className={`h-3 w-3 rounded-full ${DOT_CLS[s]}`} />
            <span><span className="num block text-[24px] font-semibold leading-none">{counts[s]}</span><span className="caption">{POST_STATUS_LABEL[s]}</span></span>
          </button>
        ))}
      </div>

      {weeks.length > 0 && (
        <details className="card-flat mt-5">
          <summary className="flex cursor-pointer items-center gap-2 text-[16px] font-semibold"><Sparkles size={17} className="text-accent" />Rédiger les légendes d&apos;une semaine avec l&apos;IA</summary>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <div className="min-w-[240px] flex-1"><label className="label" htmlFor="week">Semaine</label>
              <select id="week" className="input" value={weekId} onChange={(e) => setWeekId(e.target.value)}>{weeks.map((w) => <option key={w.id} value={w.id}>{w.channel} · semaine {w.week}{w.theme ? ` : ${w.theme}` : ""}</option>)}</select></div>
            <button type="button" className="btn-primary" onClick={generateWeek} disabled={busy}><Sparkles size={16} />{busy ? "Rédaction en cours…" : "Rédiger cette semaine"}</button>
          </div>
        </details>
      )}
      {error && <GenerateError message={error} onRetry={() => setError(null)} />}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="Réseau" className="input !w-auto !py-1.5" value={channel} onChange={(e) => { setChannel(e.target.value); setDay(null); }}><option value="">Tous les réseaux</option>{channels.map((c) => <option key={c}>{c}</option>)}</select>
          {pillars.length > 0 && <select aria-label="Pilier" className="input !w-auto !py-1.5" value={pillar} onChange={(e) => setPillar(e.target.value)}><option value="">Tous les piliers</option>{pillars.map((p) => <option key={p}>{p}</option>)}</select>}
          {(channel || pillar || statusFilter !== "all") && <button type="button" className="btn-ghost text-accent" onClick={() => { setChannel(""); setPillar(""); setStatusFilter("all"); }}>Tout afficher</button>}
        </div>
        <div className="flex rounded-pill bg-white p-1 shadow-card" role="group" aria-label="Affichage">
          {([["mois", "Mois", CalendarDays], ["kanban", "Kanban", Columns3], ["liste", "Liste", List]] as const).map(([v, label, Icon]) => (
            <button key={v} type="button" aria-pressed={view === v} onClick={() => { setView(v); setDay(null); }} className={`flex items-center gap-1.5 rounded-pill px-4 py-1.5 text-[14px] font-medium ${view === v ? "bg-accent text-white" : "text-ink-secondary"}`}><Icon size={15} />{label}</button>
          ))}
        </div>
      </div>

      {view === "mois" && (
        <>
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
                    className={`flex min-h-[64px] flex-col items-stretch rounded-xl border p-1.5 text-left transition sm:min-h-[92px] ${selected ? "border-accent bg-accent-soft" : "border-black/5 bg-white hover:border-black/20"} ${c.inMonth ? "" : "opacity-40"} ${c.iso === today ? "ring-2 ring-accent/40" : ""}`}>
                    <span className="text-[13px] font-semibold">{Number(c.iso.slice(8))}</span>
                    <span className="mt-auto flex flex-wrap gap-1">
                      {list.slice(0, 5).map((p) => <span key={p.id} aria-hidden className={`h-2 w-2 rounded-full ${DOT_CLS[p.status]}`} />)}
                      {list.length > 0 && <span className="hidden truncate text-[11px] text-ink-secondary sm:block">{list.length} post{list.length > 1 ? "s" : ""}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="caption mt-3 flex flex-wrap gap-x-4">{POST_STATUSES.map((s) => <span key={s} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${DOT_CLS[s]}`} />{POST_STATUS_LABEL[s]}</span>)}</p>
          </div>
          <h2 className="mt-6 text-[19px]">{day ? <span className="capitalize">{dayTitle(day)}</span> : <span className="capitalize">Publications de {monthTitle(cursor.y, cursor.m)}</span>}</h2>
          {shownDay.length === 0 ? <p className="mt-2 text-ink-secondary">Aucune publication ici.</p> : <ul className="mt-3 grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">{shownDay.map((p) => <li key={p.id}><Chip p={p} onOpen={setOpenId} /></li>)}</ul>}
        </>
      )}

      {view === "kanban" && (
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {POST_STATUSES.map((s) => {
            const col = sorted.filter((p) => p.status === s);
            return (
              <div key={s} onDragOver={(e) => { e.preventDefault(); }} onDrop={() => { if (dragId) { const p = posts.find((x) => x.id === dragId); if (p && p.status !== s) void patch(p.id, { status: s }); setDragId(null); } }} className="rounded-2xl bg-white/70 p-3 ring-1 ring-black/5">
                <div className="mb-3 flex items-center gap-2 px-1"><span className={`h-2.5 w-2.5 rounded-full ${DOT_CLS[s]}`} /><h2 className="text-[15px] font-semibold">{POST_STATUS_LABEL[s]}</h2><span className="num ml-auto text-[13px] text-ink-secondary">{col.length}</span></div>
                <ul className="space-y-2.5">
                  {col.slice(0, 40).map((p) => (
                    <li key={p.id} draggable onDragStart={() => setDragId(p.id)} onDragEnd={() => setDragId(null)} className="cursor-grab active:cursor-grabbing"><Chip p={p} onOpen={setOpenId} /></li>
                  ))}
                </ul>
                {col.length > 40 && <p className="caption mt-2 px-1">+ {col.length - 40} autres : utilisez la vue Liste ou un filtre.</p>}
                {col.length === 0 && <p className="px-1 py-6 text-center text-[13px] text-ink-secondary">Glissez une publication ici.</p>}
              </div>
            );
          })}
        </div>
      )}

      {view === "liste" && (
        <div className="card-flat mt-4 overflow-x-auto !p-0">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead><tr className="caption border-b hairline"><th className="px-4 py-3">Date</th><th className="py-3 pr-3">Réseau</th><th className="py-3 pr-3">Format</th><th className="py-3 pr-3">Publication</th><th className="py-3 pr-3">Responsable</th><th className="py-3 pr-4">Statut</th></tr></thead>
            <tbody>
              {upcomingFirst.slice(0, limit).map((p) => (
                <tr key={p.id} className="cursor-pointer border-b hairline last:border-0 hover:bg-canvas" onClick={() => setOpenId(p.id)}>
                  <td className="num px-4 py-3 font-medium">{p.scheduled_date ? p.scheduled_date.split("-").reverse().join("/") : "—"}</td>
                  <td className="py-3 pr-3">{p.channel ?? "—"}</td><td className="py-3 pr-3 text-ink-secondary">{p.format ?? "—"}</td>
                  <td className="max-w-[420px] truncate py-3 pr-3">{postTitle(p)}</td><td className="py-3 pr-3 text-ink-secondary">{p.assignee ?? "—"}</td>
                  <td className="py-3 pr-4"><span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${STATUS_CLS[p.status]}`}>{POST_STATUS_LABEL[p.status]}</span></td>
                </tr>
              ))}
              {upcomingFirst.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-secondary">Aucune publication avec ces filtres.</td></tr>}
            </tbody>
          </table>
          {upcomingFirst.length > limit && <div className="border-t hairline p-3"><button type="button" className="btn-secondary" onClick={() => setLimit((l) => l + LIST_STEP)}>Afficher {Math.min(LIST_STEP, upcomingFirst.length - limit)} publications de plus</button></div>}
        </div>
      )}

      {open && <Overlay><PostPanel key={open.id} post={open} onClose={() => setOpenId(null)} onPatch={patch} onDelete={remove} onWrite={write} writing={writing === open.id} /></Overlay>}
      {validating && <Overlay><ValidationPanel brandId={brandId} pending={posts.filter((p) => p.status === "a_valider")} onClose={() => { setValidating(false); void reload(); }} /></Overlay>}
    </section>
  );
}
