"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callGenerate } from "@/lib/api";
import { periodRange, type EntryStatus, type PeriodMonths } from "@/lib/editorial";
import GenerateError from "./GenerateError";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";
import { NetworkInfo } from "./StrategyBlocks";
import LineView, { type LineRow } from "./editorial/LineView";
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

export default function EditorialTab({
  brandId,
  initialLines,
  initialEntries,
  hasPillars,
  profiles = {},
  initialRows = [],
  pillarRoles = {},
}: {
  brandId: string;
  initialLines: Line[];
  initialEntries: Entry[];
  hasPillars: boolean;
  profiles?: Record<string, NetworkStage>;
  initialRows?: LineRow[];
  pillarRoles?: Record<string, string>;
}) {
  const supabase = createClient();
  const [lines, setLines] = useState<Line[]>(initialLines);
  const [entries, setEntries] = useState<Entry[]>(initialEntries);
  const [rows, setRows] = useState<LineRow[]>(initialRows);
  const [activeId, setActiveId] = useState<string | null>(initialLines[0]?.id ?? null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [channelChoice, setChannelChoice] = useState("Facebook");
  const [customChannel, setCustomChannel] = useState("");
  const [months, setMonths] = useState<PeriodMonths>(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
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

  const rowsByEntry = new Map<string, LineRow[]>();
  for (const r of rows) if (r.editorial_entry_id) rowsByEntry.set(r.editorial_entry_id, [...(rowsByEntry.get(r.editorial_entry_id) ?? []), r]);

  async function patchRow(id: string, patch: { idea?: string; hook?: string; format?: string }) {
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
    setSave("saving");
    const { error: err } = await supabase.from("posts").update(patch).eq("id", id);
    setSave(err ? "error" : "saved");
  }

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

      {active && profiles[active.channel ?? ""] && <NetworkInfo profile={profiles[active.channel ?? ""]} eyebrow={`Section ${String(lines.findIndex((l) => l.id === active.id) + 1).padStart(2, "0")} — Ligne éditoriale ${active.channel}`} />}

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
        <LineView channel={active.channel ?? ""} periodStart={active.period_start ?? new Date().toISOString().slice(0, 10)} entries={lineEntries} rowsByEntry={rowsByEntry} pillarRoles={pillarRoles}
          onEntry={(id, p) => patchEntry(id, p)} onRow={patchRow} onRegenerate={regenerateWeek} busyId={busy === "line" ? null : busy} />
      )}
    </section>
  );
}
