"use client";

import { ChevronDown, Plus, RefreshCw, Trash2 } from "lucide-react";
import { addDays, POST_FORMATS } from "@/lib/posts";
import { monthName } from "@/lib/plan/calendar";
import EditableText from "../EditableText";

export type LineEntry = { id: string; week_number: number | null; theme: string | null; phase?: string | null; campaign?: string | null };
export type RowPatch = { idea?: string; hook?: string; format?: string; scheduled_date?: string; pillar?: string };
export type LineRow = { id: string; editorial_entry_id: string | null; scheduled_date: string | null; idea: string | null; hook: string | null; pillar: string | null; format: string | null; caption: string | null; status: string };

const NETWORK_PILL: Record<string, string> = {
  Facebook: "bg-[#1877F2] text-white", Instagram: "bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white", TikTok: "bg-black text-white",
  YouTube: "bg-[#FF0000] text-white", LinkedIn: "bg-[#0A66C2] text-white", WhatsApp: "bg-[#25D366] text-white",
};
const PHASE: Record<string, { label: string; cls: string }> = {
  avant: { label: "Avant", cls: "bg-accent-soft text-accent" }, pendant: { label: "Pendant", cls: "bg-success/20 text-ink" },
  apres: { label: "Après", cls: "bg-warning/25 text-ink" }, evergreen: { label: "Permanent", cls: "bg-black/10 text-ink" },
};
const SHORT = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", timeZone: "UTC" });
const dayOption = (iso: string) => SHORT.format(new Date(iso + "T00:00:00Z")).replace(/^./, (c) => c.toUpperCase());
const SELECT = "w-full rounded-lg border border-black/10 bg-white px-2 py-1.5 text-[14px]";

/** Mois d'une semaine : celui de son jeudi (comme dans un calendrier de travail). */
export function weekMonth(periodStart: string, week: number): string {
  return addDays(periodStart, (week - 1) * 7 + 3).slice(0, 7);
}

/**
 * Ligne éditoriale d'un réseau, présentée comme un document : un accordéon par mois, un bloc par semaine, un tableau par semaine
 * (Jour, Pilier, Contenu et idée créative, Format, Accroche). Tout se modifie en place.
 */
export default function LineView({ channel, periodStart, entries, rowsByEntry, pillarRoles, onEntry, onRow, onAddRow, onDeleteRow, onRegenerate, busyId }: {
  channel: string; periodStart: string; entries: LineEntry[]; rowsByEntry: Map<string, LineRow[]>; pillarRoles: Record<string, string>;
  onEntry: (id: string, patch: { theme: string }) => void; onRow: (id: string, patch: RowPatch) => void; onAddRow: (entryId: string, weekStart: string) => void; onDeleteRow: (id: string) => void;
  onRegenerate: (id: string) => void; busyId: string | null;
}) {
  const pillars = Object.keys(pillarRoles).filter(Boolean);
  const allFormats = [...new Set([...POST_FORMATS, ...[...rowsByEntry.values()].flat().map((r) => r.format ?? "").filter(Boolean)])];
  const months = new Map<string, LineEntry[]>();
  for (const e of entries) {
    const key = weekMonth(periodStart, e.week_number ?? 1);
    months.set(key, [...(months.get(key) ?? []), e]);
  }
  const currentMonth = new Date().toISOString().slice(0, 7);
  const keys = [...months.keys()];
  const openKey = keys.includes(currentMonth) ? currentMonth : keys[0];

  return (
    <div className="mt-8 space-y-3">
      {keys.map((key) => {
        const list = months.get(key)!;
        const campaigns = [...new Set(list.map((e) => e.campaign).filter((c): c is string => !!c))];
        return (
          <details key={key} open={key === openKey} className="group overflow-hidden rounded-3xl border border-black/10 bg-white shadow-card">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 bg-accent px-6 py-4 text-white">
              <span><span className="block text-[22px] font-semibold capitalize leading-tight">{monthName(key)}</span><span className="block text-[13px] text-white/80">{campaigns.length ? campaigns.join(" · ") : "Contenus permanents"}</span></span>
              <ChevronDown size={20} className="shrink-0 transition group-open:rotate-180" />
            </summary>
            <div className="divide-y divide-black/5">
              {list.map((e) => {
                const rows = (rowsByEntry.get(e.id) ?? []).slice().sort((a, b) => (a.scheduled_date ?? "").localeCompare(b.scheduled_date ?? ""));
                const phase = e.phase ? PHASE[e.phase] : null;
                const weekStart = addDays(periodStart, ((e.week_number ?? 1) - 1) * 7);
                return (
                  <div key={e.id} className="px-4 py-5 sm:px-6">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className={`rounded-pill px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${NETWORK_PILL[channel] ?? "bg-night text-white"}`}>{channel}</span>
                      <span className="num text-[14px] font-semibold text-ink-secondary">S{e.week_number} —</span>
                      <div className="min-w-0 flex-1"><EditableText label={`Thème de la semaine ${e.week_number}`} className="text-[16px] font-semibold" value={e.theme ?? ""} onSave={(v) => onEntry(e.id, { theme: v })} /></div>
                      {phase && <span className={`rounded-pill px-2.5 py-0.5 text-[12px] font-medium ${phase.cls}`}>{phase.label}</span>}
                      <button type="button" className="btn-ghost !px-2 text-ink-secondary" aria-label={`Régénérer la semaine ${e.week_number}`} title="Régénérer le thème de cette semaine" disabled={busyId !== null} onClick={() => onRegenerate(e.id)}><RefreshCw size={15} className={busyId === e.id ? "animate-spin" : ""} /></button>
                    </div>
                    {rows.length === 0 ? (
                      <p className="mt-3 text-[14px] text-ink-secondary">Aucune publication prévue cette semaine.</p>
                    ) : (
                      <div className="mt-3 overflow-x-auto rounded-2xl border border-black/10">
                        <table className="w-full min-w-[820px] text-left text-[14px]">
                          <thead><tr className="bg-[var(--color-accent-strong)] text-[11px] font-bold uppercase tracking-[0.06em] text-white"><th className="px-4 py-3">Jour</th><th className="px-3 py-3">Pilier</th><th className="px-3 py-3">Contenu et idée</th><th className="px-3 py-3">Format</th><th className="px-3 py-3">Accroche</th><th className="w-10 px-2 py-3"><span className="sr-only">Supprimer</span></th></tr></thead>
                          <tbody>
                            {rows.map((r, i) => {
                              const cta = pillarRoles[r.pillar ?? ""] === "appel";
                              const options = Array.from({ length: 7 }, (_, k) => addDays(weekStart, k));
                              const dayOptions = r.scheduled_date && !options.includes(r.scheduled_date) ? [r.scheduled_date, ...options] : options;
                              const pillarOptions = r.pillar && !pillars.includes(r.pillar) ? [r.pillar, ...pillars] : pillars;
                              const formatOptions = r.format && !allFormats.includes(r.format) ? [r.format, ...allFormats] : allFormats;
                              return (
                                <tr key={r.id} className={`align-top ${i % 2 ? "bg-canvas" : "bg-white"}`}>
                                  <td className="px-3 py-2"><select aria-label="Jour de la publication" className={`${SELECT} font-semibold`} value={r.scheduled_date ?? ""} onChange={(e) => onRow(r.id, { scheduled_date: e.target.value })}>{!r.scheduled_date && <option value="">—</option>}{dayOptions.map((d) => <option key={d} value={d}>{dayOption(d)}</option>)}</select></td>
                                  <td className="px-3 py-2"><select aria-label="Pilier" className={`${SELECT} ${cta ? "bg-warning/15" : ""}`} value={r.pillar ?? ""} onChange={(e) => onRow(r.id, { pillar: e.target.value })}>{!r.pillar && <option value="">—</option>}{pillarOptions.map((n) => <option key={n} value={n}>{n}</option>)}</select></td>
                                  <td className="px-3 py-1.5"><EditableText multiline label="Contenu et idée créative" className="text-[14px]" value={r.idea ?? ""} placeholder="Écrire l'idée" onSave={(v) => onRow(r.id, { idea: v })} /></td>
                                  <td className="px-3 py-2"><select aria-label="Format" className={`${SELECT} font-semibold text-accent`} value={r.format ?? ""} onChange={(e) => onRow(r.id, { format: e.target.value })}>{!r.format && <option value="">—</option>}{formatOptions.map((f) => <option key={f} value={f}>{f}</option>)}</select></td>
                                  <td className="px-3 py-1.5"><EditableText multiline label="Accroche" className="text-[14px] italic text-ink-secondary" value={r.hook ?? ""} placeholder="Écrire l'accroche" onSave={(v) => onRow(r.id, { hook: v })} /></td>
                                  <td className="px-2 py-2"><button type="button" aria-label="Supprimer cette publication" title="Supprimer cette publication" className="rounded-full p-1.5 text-ink-secondary hover:bg-black/5 hover:text-danger" onClick={() => onDeleteRow(r.id)}><Trash2 size={15} /></button></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <button type="button" className="mt-2 inline-flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-[14px] font-medium text-accent hover:bg-accent-soft" onClick={() => onAddRow(e.id, weekStart)}><Plus size={15} />Ajouter une publication</button>
                  </div>
                );
              })}
            </div>
          </details>
        );
      })}
    </div>
  );
}
