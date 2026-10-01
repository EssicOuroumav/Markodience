"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EMPTY_KPI, dateLabel, deadlineFor, deadlineState, kpiData, monthLabel, recentMonths, wasOnTime, type KpiData } from "@/lib/kpi";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PageHeader from "./PageHeader";

export type KpiReport = { id: string; month: string; data: unknown; submitted_at: string | null; deadline: string | null };

type Props = { brandId: string; brandName: string; deadlineDay: number; initial: KpiReport[]; watermark: boolean };

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const toForm = (raw: unknown): KpiData => {
  const p = kpiData.safeParse(raw);
  return p.success ? p.data : EMPTY_KPI;
};
const num = (v: string) => (v === "" ? 0 : Math.max(0, Math.floor(Number(v)) || 0));

export default function KpiTab({ brandId, brandName, deadlineDay: initialDay, initial, watermark }: Props) {
  const supabase = createClient();
  const months = recentMonths(new Date());
  const [reports, setReports] = useState<KpiReport[]>(initial);
  const [month, setMonth] = useState(months[0]);
  const [form, setForm] = useState<KpiData>(() => toForm(initial.find((r) => r.month === months[0])?.data));
  const [viewing, setViewing] = useState<KpiReport | null>(null);
  const [day, setDay] = useState(initialDay);
  const [save, setSave] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const existing = reports.find((r) => r.month === month) ?? null;
  const readOnly = viewing !== null;
  const shown = viewing ? toForm(viewing.data) : form;
  const bannerMonth = viewing?.month ?? month;
  const bannerReport = viewing ?? existing;
  const deadline = bannerReport?.deadline ?? deadlineFor(bannerMonth, day);
  const state = deadlineState(todayIso(), deadline, bannerReport?.submitted_at ?? null);

  function pickMonth(m: string) {
    setViewing(null);
    setMonth(m);
    setForm(toForm(reports.find((r) => r.month === m)?.data));
    setMenu(false);
    setError(null);
    setSave("idle");
  }

  const set = <K extends keyof KpiData>(k: K, v: KpiData[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setError(null);
    const parsed = kpiData.safeParse(form);
    if (!parsed.success) return setError("Vérifiez les valeurs : des nombres entiers positifs sont attendus.");
    setSave("saving");
    const submittedAt = existing?.submitted_at ?? new Date().toISOString();
    const row = {
      brand_profile_id: brandId,
      month,
      data: parsed.data,
      submitted_at: submittedAt,
      deadline: existing?.deadline ?? deadlineFor(month, day),
    };
    const { data, error: err } = await supabase
      .from("kpi_reports")
      .upsert(row, { onConflict: "brand_profile_id,month" })
      .select("id, month, data, submitted_at, deadline")
      .single();
    if (err || !data) {
      setSave("error");
      return setError("Le rapport n'a pas pu être enregistré. Réessayez.");
    }
    setReports((rs) => [data as KpiReport, ...rs.filter((r) => r.month !== month)]);
    setSave("saved");
  }

  async function saveDay(next: number) {
    const d = Math.min(28, Math.max(1, next || 5));
    setDay(d);
    const { error: err } = await supabase.from("brand_profiles").update({ kpi_deadline_day: d }).eq("id", brandId);
    setSave(err ? "error" : "saved");
  }

  async function exportPdf(m: string, raw: unknown) {
    const { buildKpiPdf, kpiFileName } = await import("@/lib/kpiPdf");
    buildKpiPdf({ brandName, month: m, data: toForm(raw), watermark }).save(kpiFileName(brandName, m));
  }

  const field = (id: string, label: string, value: number, onChange: (n: number) => void) => (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} type="number" min={0} step={1} inputMode="numeric" className="input" disabled={readOnly} value={value === 0 && !readOnly ? "" : value}
        placeholder="0" onChange={(e) => onChange(num(e.target.value))} />
    </div>
  );

  return (
    <section>
      <PageHeader tab="kpi">
          <SaveIndicator state={save} />
          <div ref={menuRef} className="relative">
            <button type="button" className="btn-secondary gap-2" aria-haspopup="listbox" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              {monthLabel(bannerMonth)} <span aria-hidden className="text-ink-secondary">▾</span>
            </button>
            {menu && (
              <div role="listbox" className="glass-float absolute right-0 z-20 mt-2 max-h-72 w-56 overflow-y-auto rounded-[18px] p-2 shadow-card-hover">
                {months.map((m) => (
                  <button key={m} type="button" role="option" aria-selected={m === bannerMonth} onClick={() => pickMonth(m)}
                    className={`flex w-full items-center justify-between rounded-btn px-3 py-2 text-left text-[15px] hover:bg-black/5 ${m === bannerMonth ? "font-semibold" : ""}`}>
                    {monthLabel(m)} {reports.some((r) => r.month === m) && <span aria-label="rapport envoyé" className="text-success">●</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        </PageHeader>

      {state === "submitted" && bannerReport?.submitted_at && (
        <p role="status" className="mt-4 text-[15px] text-ink-secondary">Rapport de {monthLabel(bannerMonth)} envoyé le {dateLabel(bannerReport.submitted_at)}.</p>
      )}
      {state === "pending" && (
        <p role="status" className="mt-4 rounded-btn bg-warning/15 px-4 py-3 text-[15px]">Rapport à soumettre avant le {dateLabel(deadline)}.</p>
      )}
      {state === "late" && (
        <p role="alert" className="mt-4 rounded-btn bg-danger/15 px-4 py-3 text-[15px]">Rapport en retard depuis le {dateLabel(deadline)}.</p>
      )}

      {viewing && (
        <div className="mt-4 flex items-center gap-3">
          <span className="caption">Lecture seule : rapport archivé.</span>
          <button type="button" className="btn-secondary" onClick={() => pickMonth(months[0])}>Retour au mois en cours</button>
        </div>
      )}

      <div className="card-flat mt-6 space-y-6 !p-8">
      <h2 className="section-title">Indicateurs du mois</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        {field("reach", "Portée totale", shown.reach, (n) => set("reach", n))}
        {field("engagement", "Engagement total (likes + commentaires + partages)", shown.engagement, (n) => set("engagement", n))}
        {field("followers", "Nouveaux abonnés sur la période", shown.new_followers, (n) => set("new_followers", n))}
        <div>
          <span className="label">Publications réalisées / planifiées</span>
          <div className="flex items-center gap-2">
            <input aria-label="Publications réalisées" type="number" min={0} step={1} className="input" disabled={readOnly} value={shown.posts_done === 0 && !readOnly ? "" : shown.posts_done} placeholder="0" onChange={(e) => set("posts_done", num(e.target.value))} />
            <span aria-hidden>/</span>
            <input aria-label="Publications planifiées" type="number" min={0} step={1} className="input" disabled={readOnly} value={shown.posts_planned === 0 && !readOnly ? "" : shown.posts_planned} placeholder="0" onChange={(e) => set("posts_planned", num(e.target.value))} />
          </div>
          <p className="caption mt-1">Ratio : {shown.posts_done} / {shown.posts_planned}</p>
        </div>
      </div>
      <div className="mt-5">
        <label className="label" htmlFor="best">Meilleur contenu du mois</label>
        <input id="best" className="input" disabled={readOnly} value={shown.best_content} maxLength={1000} onChange={(e) => set("best_content", e.target.value)} placeholder="Courte description" />
      </div>
      <div className="mt-5">
        <label className="label" htmlFor="notes">Observations / points à signaler (facultatif)</label>
        <textarea id="notes" rows={3} className="input" disabled={readOnly} value={shown.notes} maxLength={2000} onChange={(e) => set("notes", e.target.value)} />
      </div>

      </div>
      {error && <p role="alert" className="mt-4 text-[15px] text-danger">{error}</p>}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        {!readOnly && <button type="button" className="btn-primary" onClick={submit} disabled={save === "saving"}>{existing ? "Mettre à jour le rapport" : "Soumettre le rapport"}</button>}
        {(viewing || existing) && (
          <button type="button" className="btn-secondary" onClick={() => exportPdf(bannerMonth, viewing?.data ?? existing?.data)}>Exporter en PDF</button>
        )}
      </div>

      <div className="mt-8 flex flex-wrap items-center gap-2 text-[15px] text-ink-secondary">
        <label htmlFor="day">Échéance : le</label>
        <input id="day" type="number" min={1} max={28} className="input !w-20 !py-1.5" value={day} onChange={(e) => setDay(Number(e.target.value))} onBlur={() => saveDay(day)} />
        <span>du mois suivant la période couverte.</span>
      </div>

      <div className="mt-12">
        <h2 className="section-title">Historique des rapports</h2>
        {reports.length === 0 ? (
          <p className="mt-3 text-ink-secondary">Aucun rapport soumis pour l&apos;instant.</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {[...reports].sort((a, b) => b.month.localeCompare(a.month)).map((r) => {
              const onTime = r.submitted_at && r.deadline ? wasOnTime(r.submitted_at, r.deadline) : true;
              return (
                <li key={r.id} className="card flex flex-wrap items-center gap-3">
                  <button type="button" className="min-w-0 flex-1 text-left" onClick={() => { setViewing(r); window.scrollTo({ top: 0, behavior: "smooth" }); }} aria-label={`Voir le rapport de ${monthLabel(r.month)}`}>
                    <span className="block text-[17px] font-medium">{monthLabel(r.month)}</span>
                    <span className="caption">{r.submitted_at ? `Soumis le ${dateLabel(r.submitted_at)}` : "Non soumis"}</span>
                  </button>
                  <span className={`rounded-pill px-3 py-1 text-[13px] font-medium ${onTime ? "bg-success/20" : "bg-danger/20"}`}>{onTime ? "À temps" : "En retard"}</span>
                  <button type="button" className="btn-secondary" aria-label={`Exporter ${monthLabel(r.month)} en PDF`} onClick={() => exportPdf(r.month, r.data)}>PDF</button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
