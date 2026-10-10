"use client";

import { ChevronDown, RefreshCw } from "lucide-react";
import { addDays } from "@/lib/posts";
import { monthName } from "@/lib/plan/calendar";
import EditableText from "../EditableText";

export type LineEntry = { id: string; week_number: number | null; theme: string | null; phase?: string | null; campaign?: string | null };
export type LineRow = { id: string; editorial_entry_id: string | null; scheduled_date: string | null; idea: string | null; hook: string | null; pillar: string | null; format: string | null; caption: string | null; status: string };

const NETWORK_PILL: Record<string, string> = {
  Facebook: "bg-[#1877F2] text-white", Instagram: "bg-gradient-to-r from-[#F58529] via-[#DD2A7B] to-[#8134AF] text-white", TikTok: "bg-black text-white",
  YouTube: "bg-[#FF0000] text-white", LinkedIn: "bg-[#0A66C2] text-white", WhatsApp: "bg-[#25D366] text-white",
};
const DAY = new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" });
const PHASE: Record<string, { label: string; cls: string }> = {
  avant: { label: "Avant", cls: "bg-accent-soft text-accent" }, pendant: { label: "Pendant", cls: "bg-success/20 text-ink" },
  apres: { label: "Après", cls: "bg-warning/25 text-ink" }, evergreen: { label: "Permanent", cls: "bg-black/10 text-ink" },
};
const dayLabel = (iso: string | null) => (iso ? DAY.format(new Date(iso + "T00:00:00Z")).replace(/^./, (c) => c.toUpperCase()) : "—");

/** Mois d'une semaine : celui de son jeudi (comme dans un calendrier de travail). */
export function weekMonth(periodStart: string, week: number): string {
  return addDays(periodStart, (week - 1) * 7 + 3).slice(0, 7);
}

/**
 * Ligne éditoriale d'un réseau, présentée comme un document : un accordéon par mois, un bloc par semaine, un tableau par semaine
 * (Jour, Pilier, Contenu et idée créative, Format, Accroche). Tout se modifie en place.
 */
export default function LineView({ channel, periodStart, entries, rowsByEntry, pillarRoles, onEntry, onRow, onRegenerate, busyId }: {
  channel: string; periodStart: string; entries: LineEntry[]; rowsByEntry: Map<string, LineRow[]>; pillarRoles: Record<string, string>;
  onEntry: (id: string, patch: { theme: string }) => void; onRow: (id: string, patch: { idea?: string; hook?: string; format?: string }) => void; onRegenerate: (id: string) => void; busyId: string | null;
}) {
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
                        <table className="w-full min-w-[760px] text-left text-[14px]">
                          <thead><tr className="bg-[var(--color-accent-strong)] text-[11px] font-bold uppercase tracking-[0.06em] text-white"><th className="px-4 py-3">Jour</th><th className="px-3 py-3">Pilier</th><th className="px-3 py-3">Contenu &amp; idée créative</th><th className="px-3 py-3">Format</th><th className="px-3 py-3">Hook / accroche</th></tr></thead>
                          <tbody>
                            {rows.map((r, i) => {
                              const cta = pillarRoles[r.pillar ?? ""] === "appel";
                              return (
                                <tr key={r.id} className={`align-top ${i % 2 ? "bg-canvas" : "bg-white"}`}>
                                  <td className="px-4 py-3 font-semibold">{dayLabel(r.scheduled_date)}</td>
                                  <td className="px-3 py-3">{r.pillar && <span className={`inline-block rounded-pill px-2.5 py-0.5 text-[12px] font-semibold ${cta ? "bg-warning/25 text-ink" : "bg-accent-soft text-accent"}`}>{r.pillar}</span>}</td>
                                  <td className="px-3 py-1.5"><EditableText multiline label="Contenu et idée créative" className="text-[14px]" value={r.idea ?? ""} onSave={(v) => onRow(r.id, { idea: v })} /></td>
                                  <td className="px-3 py-1.5"><EditableText label="Format" className="text-[14px] font-semibold text-accent" value={r.format ?? ""} onSave={(v) => onRow(r.id, { format: v })} /></td>
                                  <td className="px-3 py-1.5"><EditableText multiline label="Accroche" className="text-[14px] italic text-ink-secondary" value={r.hook ?? ""} onSave={(v) => onRow(r.id, { hook: v })} /></td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
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
