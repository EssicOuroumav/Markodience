"use client";

import { AlertTriangle, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { monthLabel, monthStart } from "@/lib/kpi";
import {
  ACTION_STATUSES, ACTION_STATUS_LABEL, KPI_DIRECTIONS, KPI_DIRECTION_LABEL, KPI_PERIODS, KPI_PERIOD_LABEL, KPI_STATE_LABEL, STATE_CLS,
  formatValue, kpiState, lastChange, parseNumber, progress, type ActionStatus, type KpiDirection, type KpiPeriod,
} from "@/lib/performance";
import EditableText from "./EditableText";
import GenerateError from "./GenerateError";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

export type KpiDefinition = { id: string; name: string; unit: string; direction: KpiDirection; baseline: number | null; target: number | null; period: KpiPeriod; source: string; frequency: string; alert_threshold: number | null; owner: string; corrective_action: string };
export type KpiValue = { id: string; definition_id: string; month: string; value: number };
export type KpiAction = { id: string; definition_id: string | null; title: string; owner: string; due_date: string | null; status: ActionStatus; created_at: string };

const DEF_COLS = "id, name, unit, direction, baseline, target, period, source, frequency, alert_threshold, owner, corrective_action";
const VAL_COLS = "id, definition_id, month, value";
const ACT_COLS = "id, definition_id, title, owner, due_date, status, created_at";
const EMPTY = { name: "", unit: "", direction: "hausse" as KpiDirection, baseline: "", target: "", period: "mensuel" as KpiPeriod, source: "", frequency: "", alert_threshold: "", owner: "", corrective_action: "" };

export default function PerformanceTab({ brandId, initialDefs, initialValues, initialActions, planIndicators }: { brandId: string; initialDefs: KpiDefinition[]; initialValues: KpiValue[]; initialActions: KpiAction[]; planIndicators: string[] }) {
  const supabase = createClient();
  const [defs, setDefs] = useState(initialDefs);
  const [values, setValues] = useState(initialValues);
  const [actions, setActions] = useState(initialActions);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const month = monthStart(new Date());

  const series = (id: string) => values.filter((v) => v.definition_id === id).sort((a, b) => a.month.localeCompare(b.month));
  const latest = (id: string) => series(id).at(-1) ?? null;
  const states = defs.map((d) => ({ d, state: kpiState(d, latest(d.id)?.value ?? null) }));
  const counts = { alerte: states.filter((s) => s.state === "alerte").length, retard: states.filter((s) => s.state === "en_retard").length, ok: states.filter((s) => s.state === "atteint" || s.state === "en_bonne_voie").length };
  const openActions = actions.filter((a) => a.status !== "fait");

  async function addDef(over?: Partial<typeof EMPTY>) {
    setError(null);
    const f = { ...form, ...over };
    if (!f.name.trim()) return setError("Donnez un nom à l'indicateur.");
    const nums = { baseline: parseNumber(f.baseline), target: parseNumber(f.target), alert_threshold: parseNumber(f.alert_threshold) };
    if (Object.values(nums).some((n) => n === undefined)) return setError("Les chiffres doivent être des nombres (exemple : 1 200 ou 3,5).");
    setSave("saving");
    const row = { brand_profile_id: brandId, name: f.name.trim().slice(0, 120), unit: f.unit.trim().slice(0, 20), direction: f.direction, ...nums, period: f.period, source: f.source.trim().slice(0, 160), frequency: f.frequency.trim().slice(0, 80), owner: f.owner.trim().slice(0, 120), corrective_action: f.corrective_action.trim().slice(0, 600), position: defs.length };
    const { data, error: err } = await supabase.from("kpi_definitions").insert(row).select(DEF_COLS).single();
    if (err || !data) { setSave("error"); return setError(err?.code === "42501" ? "Les indicateurs demandent un palier payant, ou la limite de 40 est atteinte." : "L'indicateur n'a pas pu être enregistré."); }
    setDefs((ds) => [...ds, data as KpiDefinition]);
    setForm(EMPTY);
    setAdding(false);
    setSave("saved");
  }

  async function importPlan() {
    setError(null);
    const known = new Set(defs.map((d) => d.name.toLowerCase()));
    const fresh = planIndicators.filter((n) => !known.has(n.toLowerCase())).slice(0, 40 - defs.length);
    if (fresh.length === 0) return setError("Tous les indicateurs du plan sont déjà ajoutés.");
    setSave("saving");
    const rows = fresh.map((name, i) => ({ brand_profile_id: brandId, name: name.slice(0, 120), position: defs.length + i }));
    const { data, error: err } = await supabase.from("kpi_definitions").insert(rows).select(DEF_COLS);
    if (err || !data) { setSave("error"); return setError("L'import n'a pas pu être fait (palier payant requis)."); }
    setDefs((ds) => [...ds, ...(data as KpiDefinition[])]);
    setSave("saved");
  }

  async function patchDef(id: string, p: Partial<KpiDefinition>) {
    setDefs((ds) => ds.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("kpi_definitions").update(p).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function patchNumber(id: string, key: "baseline" | "target" | "alert_threshold", raw: string) {
    const n = parseNumber(raw);
    if (n === undefined) return setError("Écrivez un nombre (exemple : 1 200 ou 3,5).");
    setError(null);
    await patchDef(id, { [key]: n });
  }

  async function removeDef(id: string) {
    if (!window.confirm("Supprimer cet indicateur et son historique ?")) return;
    setSave("saving");
    const { error: err } = await supabase.from("kpi_definitions").delete().eq("id", id);
    if (err) return setSave("error");
    setDefs((ds) => ds.filter((d) => d.id !== id));
    setValues((vs) => vs.filter((v) => v.definition_id !== id));
    setSave("saved");
  }

  async function recordValue(id: string) {
    const n = parseNumber(drafts[id] ?? "");
    if (n === undefined || n === null) return setError("Saisissez un nombre pour enregistrer la valeur du mois.");
    setError(null);
    setSave("saving");
    const { data, error: err } = await supabase.from("kpi_values").upsert({ definition_id: id, brand_profile_id: brandId, month, value: n }, { onConflict: "definition_id,month" }).select(VAL_COLS).single();
    if (err || !data) { setSave("error"); return setError("La valeur n'a pas pu être enregistrée."); }
    setValues((vs) => [...vs.filter((v) => !(v.definition_id === id && v.month === month)), data as KpiValue]);
    setDrafts((d) => ({ ...d, [id]: "" }));
    setSave("saved");
  }

  async function addAction(title: string, definition_id: string | null, owner = "") {
    if (!title.trim()) return;
    setSave("saving");
    const { data, error: err } = await supabase.from("kpi_actions").insert({ brand_profile_id: brandId, definition_id, title: title.trim().slice(0, 200), owner: owner.slice(0, 120) }).select(ACT_COLS).single();
    if (err || !data) { setSave("error"); return setError(err?.code === "42501" ? "Les actions demandent un palier payant, ou la limite de 150 est atteinte." : "L'action n'a pas pu être enregistrée."); }
    setActions((a) => [data as KpiAction, ...a]);
    setSave("saved");
  }

  async function patchAction(id: string, p: Partial<KpiAction>) {
    setActions((as) => as.map((x) => (x.id === id ? { ...x, ...p } : x)));
    setSave("saving");
    const { error: err } = await supabase.from("kpi_actions").update(p).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function removeAction(id: string) {
    setSave("saving");
    const { error: err } = await supabase.from("kpi_actions").delete().eq("id", id);
    if (err) return setSave("error");
    setActions((as) => as.filter((a) => a.id !== id));
    setSave("saved");
  }

  const [newAction, setNewAction] = useState("");
  const defName = (id: string | null) => defs.find((d) => d.id === id)?.name ?? null;
  const numField = (d: KpiDefinition, key: "baseline" | "target" | "alert_threshold", label: string) => (
    <div><p className="caption">{label}</p><EditableText label={`${label} de ${d.name}`} value={d[key] === null ? "" : String(d[key]).replace(".", ",")} onSave={(v) => patchNumber(d.id, key, v)} placeholder="—" className="text-[15px] font-semibold" /></div>
  );

  return (
    <section className="mb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="section-title">Mes indicateurs</h2>
          <p className="mt-1 max-w-2xl text-[15px] text-ink-secondary">Chaque indicateur a un point de départ, un objectif, un seuil d&apos;alerte, un responsable et une action corrective : sans cela, un chiffre ne dit rien.</p>
        </div>
        <div className="flex items-center gap-3">
          <SaveIndicator state={save} />
          {planIndicators.length > 0 && <button type="button" className="btn-secondary" onClick={importPlan}>Importer depuis le plan</button>}
          <button type="button" className="btn-primary" onClick={() => setAdding((v) => !v)}><Plus size={16} />Nouvel indicateur</button>
        </div>
      </div>
      {error && <GenerateError message={error} onRetry={() => setError(null)} />}

      {defs.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="num text-[26px] font-semibold leading-none">{counts.ok}</p><p className="caption mt-1">En bonne voie ou atteints</p></div>
          <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="num text-[26px] font-semibold leading-none">{counts.retard}</p><p className="caption mt-1">En retard</p></div>
          <div className="rounded-2xl border border-black/10 bg-white p-4"><p className="num text-[26px] font-semibold leading-none text-danger">{counts.alerte}</p><p className="caption mt-1">Seuil d&apos;alerte franchi</p></div>
        </div>
      )}

      {adding && (
        <div className="card-flat mt-5 space-y-4">
          <h3 className="text-[18px] font-semibold">Nouvel indicateur</h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="md:col-span-2"><label className="label" htmlFor="k-name">Nom</label><input id="k-name" className="input" maxLength={120} placeholder="Ex. : Messages de donateurs reçus" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div><label className="label" htmlFor="k-unit">Unité</label><input id="k-unit" className="input" maxLength={20} placeholder="%, FCFA, messages…" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div><label className="label" htmlFor="k-base">Point de départ</label><input id="k-base" className="input" inputMode="decimal" value={form.baseline} onChange={(e) => setForm({ ...form, baseline: e.target.value })} /></div>
            <div><label className="label" htmlFor="k-target">Objectif</label><input id="k-target" className="input" inputMode="decimal" value={form.target} onChange={(e) => setForm({ ...form, target: e.target.value })} /></div>
            <div><label className="label" htmlFor="k-alert">Seuil d&apos;alerte</label><input id="k-alert" className="input" inputMode="decimal" value={form.alert_threshold} onChange={(e) => setForm({ ...form, alert_threshold: e.target.value })} /></div>
            <div><label className="label" htmlFor="k-dir">Sens</label><select id="k-dir" className="input" value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value as KpiDirection })}>{KPI_DIRECTIONS.map((d) => <option key={d} value={d}>{KPI_DIRECTION_LABEL[d]}</option>)}</select></div>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div><label className="label" htmlFor="k-period">Période</label><select id="k-period" className="input" value={form.period} onChange={(e) => setForm({ ...form, period: e.target.value as KpiPeriod })}>{KPI_PERIODS.map((p) => <option key={p} value={p}>{KPI_PERIOD_LABEL[p]}</option>)}</select></div>
            <div><label className="label" htmlFor="k-src">Source des données</label><input id="k-src" className="input" maxLength={160} placeholder="Statistiques Facebook…" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} /></div>
            <div><label className="label" htmlFor="k-freq">Mise à jour</label><input id="k-freq" className="input" maxLength={80} placeholder="Le 5 de chaque mois" value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} /></div>
            <div><label className="label" htmlFor="k-owner">Responsable</label><input id="k-owner" className="input" maxLength={120} value={form.owner} onChange={(e) => setForm({ ...form, owner: e.target.value })} /></div>
          </div>
          <div><label className="label" htmlFor="k-fix">Action corrective si l&apos;indicateur dérape</label><input id="k-fix" className="input" maxLength={600} placeholder="Ex. : revoir les horaires de publication et relancer les partenaires" value={form.corrective_action} onChange={(e) => setForm({ ...form, corrective_action: e.target.value })} /></div>
          <div className="flex gap-3"><button type="button" className="btn-primary" onClick={() => addDef()}>Ajouter</button><button type="button" className="btn-secondary" onClick={() => { setAdding(false); setError(null); }}>Annuler</button></div>
        </div>
      )}

      <div className="mt-5 space-y-4">
        {defs.length === 0 && !adding && <div className="card-flat text-center"><p className="text-[16px] font-semibold">Aucun indicateur défini</p><p className="mt-1 text-[15px] text-ink-secondary">Ajoutez le premier, ou importez ceux du plan stratégique, puis complétez objectif et seuil d&apos;alerte.</p></div>}
        {states.map(({ d, state }) => {
          const last = latest(d.id);
          const change = lastChange(series(d.id));
          const p = progress(d, last?.value ?? null);
          return (
            <article key={d.id} className={`card-flat !p-5 ${state === "alerte" ? "border-l-4 !border-l-danger" : ""}`}>
              <div className="flex flex-wrap items-center gap-2">
                <div className="min-w-[200px] flex-1"><EditableText label="Nom de l'indicateur" value={d.name} onSave={(v) => v.trim() && patchDef(d.id, { name: v.trim().slice(0, 120) })} className="text-[18px] font-semibold" /></div>
                <span className={`rounded-pill px-3 py-1 text-[12px] font-semibold ${STATE_CLS[state]}`}>{KPI_STATE_LABEL[state]}</span>
                <button type="button" aria-label={`Supprimer ${d.name}`} onClick={() => removeDef(d.id)} className="rounded-full p-1.5 text-ink-secondary hover:bg-black/5 hover:text-danger"><Trash2 size={15} /></button>
              </div>
              <div className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <div><p className="caption">Dernière valeur{last ? ` · ${monthLabel(last.month)}` : ""}</p><p className="num text-[22px] font-semibold leading-tight">{formatValue(last?.value ?? null, d.unit)}</p>{change !== null && <p className="caption">{change >= 0 ? "+" : ""}{formatValue(change)} vs précédent</p>}</div>
                {numField(d, "baseline", "Point de départ")}
                {numField(d, "target", "Objectif")}
                {numField(d, "alert_threshold", "Seuil d'alerte")}
                <div><p className="caption">Responsable</p><EditableText label={`Responsable de ${d.name}`} value={d.owner} onSave={(v) => patchDef(d.id, { owner: v.trim().slice(0, 120) })} placeholder="—" className="text-[15px] font-semibold" /></div>
              </div>
              {p !== null && <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-label={`Progression de ${d.name}`} aria-valuenow={Math.round(p * 100)} aria-valuemin={0} aria-valuemax={100}><div className="h-full rounded-full bg-accent" style={{ width: `${Math.round(p * 100)}%` }} /></div>}
              <div className="mt-3 grid gap-3 text-[14px] md:grid-cols-3">
                <div><p className="caption">Source · période · mise à jour</p><p className="text-ink-secondary">{[d.source, KPI_PERIOD_LABEL[d.period], d.frequency].filter(Boolean).join(" · ")}</p></div>
                <div className="md:col-span-2"><p className="caption">Action corrective prévue</p><EditableText label={`Action corrective de ${d.name}`} value={d.corrective_action} onSave={(v) => patchDef(d.id, { corrective_action: v.slice(0, 600) })} placeholder="À définir" className="text-[14px]" multiline /></div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2 border-t hairline pt-3">
                <label className="caption" htmlFor={`v-${d.id}`}>Valeur de {monthLabel(month)}</label>
                <input id={`v-${d.id}`} className="input !w-32 !py-1.5" inputMode="decimal" value={drafts[d.id] ?? ""} onChange={(e) => setDrafts({ ...drafts, [d.id]: e.target.value })} onKeyDown={(e) => e.key === "Enter" && recordValue(d.id)} />
                <button type="button" className="btn-secondary !py-1.5" onClick={() => recordValue(d.id)}>Enregistrer</button>
                {state === "alerte" && d.corrective_action && !actions.some((a) => a.definition_id === d.id && a.status !== "fait") && (
                  <button type="button" className="btn-secondary !py-1.5 text-danger" onClick={() => addAction(d.corrective_action.slice(0, 200), d.id, d.owner)}><AlertTriangle size={15} />Lancer l&apos;action corrective</button>
                )}
              </div>
            </article>
          );
        })}
      </div>

      <div className="mt-10">
        <h2 className="section-title">Bilan & actions correctives</h2>
        <p className="mt-1 text-[15px] text-ink-secondary">{openActions.length ? `${openActions.length} action${openActions.length > 1 ? "s" : ""} en cours.` : "Aucune action en cours."} Chaque écart doit finir en action avec un responsable et une date.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input aria-label="Nouvelle action" className="input min-w-[260px] flex-1" maxLength={200} placeholder="Décrire l'action à mener" value={newAction} onChange={(e) => setNewAction(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addAction(newAction, null); setNewAction(""); } }} />
          <button type="button" className="btn-secondary" onClick={() => { addAction(newAction, null); setNewAction(""); }}><Plus size={16} />Ajouter l&apos;action</button>
        </div>
        {actions.length > 0 && (
          <ul className="mt-4 space-y-2">
            {actions.map((a) => (
              <li key={a.id} className="card-flat flex flex-wrap items-center gap-3 !p-4">
                <div className="min-w-[220px] flex-1">
                  <EditableText label="Action" value={a.title} onSave={(v) => v.trim() && patchAction(a.id, { title: v.trim().slice(0, 200) })} className={`text-[15px] ${a.status === "fait" ? "line-through opacity-60" : ""}`} />
                  {defName(a.definition_id) && <p className="caption px-2">Indicateur : {defName(a.definition_id)}</p>}
                </div>
                <div className="w-40"><EditableText label="Responsable de l'action" value={a.owner} onSave={(v) => patchAction(a.id, { owner: v.trim().slice(0, 120) })} placeholder="Responsable" className="text-[14px]" /></div>
                <input aria-label="Échéance de l'action" type="date" className="input !w-auto !py-1 text-[14px]" value={a.due_date ?? ""} onChange={(e) => patchAction(a.id, { due_date: e.target.value || null })} />
                <select aria-label="Statut de l'action" className="rounded-pill border border-black/10 bg-white px-3 py-1 text-[13px]" value={a.status} onChange={(e) => patchAction(a.id, { status: e.target.value as ActionStatus })}>{ACTION_STATUSES.map((s) => <option key={s} value={s}>{ACTION_STATUS_LABEL[s]}</option>)}</select>
                <button type="button" aria-label="Supprimer l'action" onClick={() => removeAction(a.id)} className="rounded-full p-1.5 text-ink-secondary hover:bg-black/5 hover:text-danger"><Trash2 size={15} /></button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
