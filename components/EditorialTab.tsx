"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callGenerate } from "@/lib/api";
import { nextStatus, periodRange, type EntryStatus, type PeriodMonths } from "@/lib/editorial";
import EditableText from "./EditableText";
import GenerateError from "./GenerateError";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import { NetworkInfo } from "./StrategyBlocks";
import type { NetworkStage } from "@/lib/plan/schemas";

export type Entry = {
  id: string;
  editorial_line_id: string;
  week_number: number | null;
  position: number | null;
  theme: string | null;
  content_type: string | null;
  format: string | null;
  frequency: string | null;
  suggested_time: string | null;
  status: EntryStatus | null;
  validation_status: "non_requis" | "en_attente" | "valide" | null;
  validated_by: string | null;
  validated_at: string | null;
  validation_requested_by: string | null;
  validation_requested_at: string | null;
  phase?: "avant" | "pendant" | "apres" | "evergreen" | null;
  campaign?: string | null;
};
export type Line = { id: string; channel: string | null; period_start: string | null; period_end: string | null };

const ENTRY_COLUMNS =
  "id, editorial_line_id, week_number, position, theme, content_type, format, frequency, suggested_time, status, validation_status, validated_by, validated_at, validation_requested_by, validation_requested_at, phase, campaign";
const CHANNEL_OPTIONS = ["Facebook", "Instagram", "TikTok", "YouTube", "Site web", "Autre"];
const STATUS_UI: Record<EntryStatus, { label: string; cls: string }> = {
  a_venir: { label: "À venir", cls: "bg-black/10 text-ink" },
  en_cours: { label: "En cours", cls: "bg-warning/20 text-ink" },
  termine: { label: "Terminé", cls: "bg-success/20 text-ink" },
};
const PHASE_UI: Record<string, { label: string; cls: string }> = {
  avant: { label: "Avant", cls: "bg-accent-soft text-accent" },
  pendant: { label: "Pendant", cls: "bg-success/20 text-ink" },
  apres: { label: "Après", cls: "bg-warning/25 text-ink" },
  evergreen: { label: "Permanent", cls: "bg-black/10 text-ink" },
};
const fmt = (iso: string | null) => (iso ? new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "");

export default function EditorialTab({
  brandId,
  initialLines,
  initialEntries,
  hasPillars,
  profiles = {},
}: {
  brandId: string;
  initialLines: Line[];
  initialEntries: Entry[];
  hasPillars: boolean;
  profiles?: Record<string, NetworkStage>;
}) {
  const supabase = createClient();
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [activeId, setActiveId] = useState<string | null>(initialLines[0]?.id ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [channelChoice, setChannelChoice] = useState("Facebook");
  const [customChannel, setCustomChannel] = useState("");
  const [months, setMonths] = useState<PeriodMonths>(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const dragId = useRef<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenuOpen(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const active = lines.find((l) => l.id === activeId) ?? null;
  const lineEntries = entries
    .filter((e) => e.editorial_line_id === activeId)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  async function reloadEntries() {
    const ids = lines.map((l) => l.id);
    if (ids.length === 0) return;
    const { data } = await supabase.from("editorial_entries").select(ENTRY_COLUMNS).in("editorial_line_id", ids);
    setEntries((data as Entry[]) ?? []);
  }

  async function addChannel() {
    setError(null);
    const name = channelChoice === "Autre" ? customChannel.trim() : channelChoice;
    if (!name) return setError("Indiquez le nom du canal.");
    if (lines.some((l) => l.channel?.toLowerCase() === name.toLowerCase())) return setError("Ce canal existe déjà pour cette marque.");
    const today = new Date().toISOString().slice(0, 10);
    const { data, error: err } = await supabase
      .from("editorial_lines")
      .insert({ brand_profile_id: brandId, channel: name, ...periodRange(today, months) })
      .select("id, channel, period_start, period_end")
      .single();
    if (err || !data) return setError("Le canal n'a pas pu être ajouté.");
    setLines((ls) => [...ls, data as Line]);
    setActiveId(data.id);
    setAdding(false);
    setCustomChannel("");
    setMenuOpen(false);
  }

  async function generateLine() {
    if (!active) return;
    setBusy("line");
    setError(null);
    const res = await callGenerate({ type: "editorial_line", editorial_line_id: active.id });
    if (!res.ok) {
      setBusy(null);
      return setError(res.error);
    }
    await reloadEntries();
    setBusy(null);
  }

  async function regenerateWeek(id: string) {
    if (!window.confirm("Régénérer cette semaine remplacera son contenu (les autres semaines ne changent pas). Continuer ?")) return;
    setBusy(id);
    setError(null);
    const res = await callGenerate({ type: "editorial_week", entry_id: id });
    if (!res.ok) {
      setBusy(null);
      return setError(res.error);
    }
    await reloadEntries();
    setBusy(null);
  }

  async function patchEntry(id: string, patch: Partial<Entry>) {
    setEntries((es) => es.map((e) => (e.id === id ? { ...e, ...patch } : e)));
    setSave("saving");
    const { error: err } = await supabase.from("editorial_entries").update(patch).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function validation(id: string, action: "request" | "validate") {
    setSave("saving");
    const res = await fetch("/api/editorial/validation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ entry_id: id, action }),
    });
    if (!res.ok) return setSave("error");
    await reloadEntries();
    setSave("saved");
  }

  async function dropOn(targetId: string) {
    const from = dragId.current;
    dragId.current = null;
    if (!from || from === targetId) return;
    const list = [...lineEntries];
    const fi = list.findIndex((e) => e.id === from);
    const ti = list.findIndex((e) => e.id === targetId);
    if (fi < 0 || ti < 0) return;
    const [moved] = list.splice(fi, 1);
    list.splice(ti, 0, moved);
    const renumbered = list.map((e, i) => ({ ...e, position: i, week_number: i + 1 }));
    setEntries((es) => [...es.filter((e) => e.editorial_line_id !== activeId), ...renumbered]);
    setSave("saving");
    const results = await Promise.all(
      renumbered.map((e) => supabase.from("editorial_entries").update({ position: e.position, week_number: e.week_number }).eq("id", e.id)),
    );
    setSave(results.some((r) => r.error) ? "error" : "saved");
  }

  if (!hasPillars) {
    return (
      <section>
        <PageHeader tab="editorial" />
        <EmptyState illustration="calendar" title="Il vous faut d’abord des piliers de contenu" text="La ligne éditoriale répartit vos piliers sur les semaines : générez-les pour commencer.">
          <Link href="/dashboard/pillars" className="btn-primary">Aller aux piliers de contenu</Link>
        </EmptyState>
      </section>
    );
  }

  return (
    <section>
      <PageHeader tab="editorial">
          <SaveIndicator state={save} />
          <div ref={menuRef} className="relative">
            <button type="button" className="btn-secondary gap-2" aria-haspopup="listbox" aria-expanded={menuOpen} onClick={() => setMenuOpen((v) => !v)}>
              {active?.channel ?? "Choisir un canal"} <span aria-hidden className="text-ink-secondary">▾</span>
            </button>
            {menuOpen && (
              <div role="listbox" className="glass-float absolute right-0 z-20 mt-2 w-56 rounded-[18px] p-2 shadow-card-hover">
                {lines.map((l) => (
                  <button key={l.id} type="button" role="option" aria-selected={l.id === activeId} className={`block w-full rounded-btn px-3 py-2 text-left text-[15px] hover:bg-black/5 ${l.id === activeId ? "font-semibold" : ""}`}
                    onClick={() => { setActiveId(l.id); setMenuOpen(false); }}>
                    {l.channel}
                  </button>
                ))}
                <div className="my-1 border-t border-black/5" />
                <button type="button" className="block w-full rounded-btn px-3 py-2 text-left text-[15px] text-accent hover:bg-black/5" onClick={() => { setAdding(true); setMenuOpen(false); }}>
                  + Ajouter un canal
                </button>
              </div>
            )}
          </div>
        </PageHeader>

      {lines.length > 0 && (
        <div role="tablist" aria-label="Canaux" className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {lines.map((l) => (
            <button key={l.id} role="tab" type="button" aria-selected={l.id === activeId} onClick={() => setActiveId(l.id)}
              className={`whitespace-nowrap rounded-pill px-5 py-2 text-[15px] font-medium transition ${l.id === activeId ? "bg-night text-white shadow-card" : "bg-white text-ink-secondary shadow-card hover:text-ink"}`}>
              {l.channel}
            </button>
          ))}
        </div>
      )}

      {active && profiles[active.channel ?? ""] && <NetworkInfo profile={profiles[active.channel ?? ""]} />}

      {adding && (
        <div className="card mt-6 space-y-4">
          <h2 className="text-[20px]">Ajouter un canal</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="chan">Canal</label>
              <select id="chan" className="input" value={channelChoice} onChange={(e) => setChannelChoice(e.target.value)}>
                {CHANNEL_OPTIONS.map((c) => (<option key={c}>{c}</option>))}
              </select>
              {channelChoice === "Autre" && <input aria-label="Nom du canal" className="input mt-2" placeholder="Nom du canal" value={customChannel} onChange={(e) => setCustomChannel(e.target.value)} />}
            </div>
            <div>
              <label className="label" htmlFor="months">Période</label>
              <select id="months" className="input" value={months} onChange={(e) => setMonths(Number(e.target.value) as PeriodMonths)}>
                <option value={1}>1 mois (4 semaines)</option>
                <option value={3}>3 mois (12 semaines)</option>
              </select>
              <p className="caption mt-1">À partir d&apos;aujourd&apos;hui : du {periodRange(new Date().toISOString().slice(0, 10), months).period_start} au {periodRange(new Date().toISOString().slice(0, 10), months).period_end}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button type="button" className="btn-primary" onClick={addChannel}>Ajouter le canal</button>
            <button type="button" className="btn-secondary" onClick={() => { setAdding(false); setError(null); }}>Annuler</button>
          </div>
        </div>
      )}

      {lines.length === 0 && !adding && (
        <div className="mt-6">
          <EmptyState illustration="calendar" title="Ajoutez votre premier canal" text="Facebook, Instagram, TikTok… Chaque canal a sa propre ligne éditoriale, générée à partir de vos piliers.">
            <button type="button" className="btn-primary" onClick={() => setAdding(true)}>+ Ajouter un canal</button>
          </EmptyState>
        </div>
      )}

      {error && <GenerateError message={error} onRetry={active && lineEntries.length === 0 ? generateLine : () => setError(null)} />}

      {active && lineEntries.length === 0 && !adding && (
        <div className="mt-6">
          <EmptyState illustration="calendar" title={`Aucune semaine planifiée pour ${active.channel}`} text={`Période du ${active.period_start} au ${active.period_end}. Vos piliers seront répartis en rotation sur chaque semaine.`}>
            <button type="button" className="btn-primary" onClick={generateLine} disabled={busy === "line"}>
              {busy === "line" ? "Génération en cours…" : "Générer la ligne éditoriale"}
            </button>
          </EmptyState>
        </div>
      )}

      {active && lineEntries.length > 0 && (
        <>
          <p className="caption mt-4">Glissez-déposez une semaine pour la réordonner. Cliquez sur un texte pour le modifier.</p>
          <ol className="mt-4 grid gap-4 lg:grid-cols-2">
            {lineEntries.map((e) => {
              const st = STATUS_UI[e.status ?? "a_venir"];
              const v = e.validation_status ?? "non_requis";
              return (
                <li key={e.id} draggable onDragStart={() => (dragId.current = e.id)} onDragOver={(ev) => ev.preventDefault()} onDrop={() => dropOn(e.id)}
                  className={`card relative cursor-grab overflow-hidden !pl-8 active:cursor-grabbing ${busy === e.id ? "opacity-50" : ""}`} aria-label={`Semaine ${e.week_number}`}>
                  <span aria-hidden className={`absolute inset-y-0 left-0 w-1.5 ${e.status === "termine" ? "bg-success" : e.status === "en_cours" ? "bg-warning" : "bg-black/10"}`} />
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="caption whitespace-nowrap font-semibold uppercase tracking-wide">⠿ Semaine {e.week_number}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {e.phase && PHASE_UI[e.phase] && <span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-medium ${PHASE_UI[e.phase].cls}`} title={e.campaign ?? undefined}>{PHASE_UI[e.phase].label}{e.campaign ? ` · ${e.campaign}` : ""}</span>}
                      {v === "en_attente" && <span className="rounded-pill bg-accent/10 px-2 py-0.5 text-[12px] text-accent" title={`Demandé par ${e.validation_requested_by ?? ""}`}>En attente de validation · {fmt(e.validation_requested_at)}</span>}
                      {v === "valide" && <span className="rounded-pill bg-success/20 px-2 py-0.5 text-[12px]" title={`Validé le ${fmt(e.validated_at)} par ${e.validated_by ?? ""}`}>Validé</span>}
                      <button type="button" aria-label={`Statut : ${st.label}. Cliquer pour changer`} className={`rounded-pill px-3 py-1 text-[13px] font-medium ${st.cls}`}
                        onClick={() => patchEntry(e.id, { status: nextStatus(e.status ?? "a_venir") })}>
                        {st.label}
                      </button>
                    </div>
                  </div>
                  <EditableText label={`Thème semaine ${e.week_number}`} className="mt-2 text-[18px] font-semibold" value={e.theme ?? ""} onSave={(x) => patchEntry(e.id, { theme: x })} />
                  <dl className="mt-2 grid grid-cols-2 gap-x-2 text-[14px]">
                    {([["content_type", "Type"], ["format", "Format"], ["frequency", "Fréquence"], ["suggested_time", "Heure"]] as const).map(([k, lab]) => (
                      <div key={k}>
                        <dt className="caption px-2">{lab}</dt>
                        <dd><EditableText label={`${lab} semaine ${e.week_number}`} value={e[k] ?? ""} onSave={(x) => patchEntry(e.id, { [k]: x })} /></dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button type="button" className="btn-secondary" disabled={busy !== null} onClick={() => regenerateWeek(e.id)}>
                      {busy === e.id ? "Régénération…" : "Régénérer cette semaine"}
                    </button>
                    {v === "non_requis" && <button type="button" className="btn-secondary" onClick={() => validation(e.id, "request")}>Demander une validation</button>}
                    {v === "en_attente" && <button type="button" className="btn-primary !px-4 !py-2 !text-[15px]" onClick={() => validation(e.id, "validate")}>Valider</button>}
                  </div>
                </li>
              );
            })}
          </ol>
        </>
      )}
    </section>
  );
}
