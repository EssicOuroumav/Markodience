"use client";

import { UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callGenerate } from "@/lib/api";
import { ACCEPTED, AUDIT_NETWORKS, MAX_FILES, MAX_TOTAL_BYTES, formatMegabytes, storageName, validateFile, validateTotal, type AuditNetwork } from "@/lib/audit";
import AuditReport from "./AuditReport";
import AuditTrend from "./AuditTrend";
import GenerateError from "./GenerateError";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";

export type AuditRow = { id: string; created_at: string; report_data: unknown };

type Picked = { file: File; preview: string | null };

const networkOf = (d: unknown) => (typeof (d as { network?: unknown })?.network === "string" ? (d as { network: string }).network : null);
const scoreOf = (d: unknown) => (typeof (d as { score?: unknown })?.score === "number" ? Math.round((d as { score: number }).score) : null);
const summaryOf = (d: unknown) => (typeof (d as { summary?: unknown })?.summary === "string" ? (d as { summary: string }).summary : "");
const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

export default function AuditTab({ brandId, initial }: { brandId: string; initial: AuditRow[] }) {
  const supabase = createClient();
  const [audits, setAudits] = useState<AuditRow[]>(initial);
  const [network, setNetwork] = useState<AuditNetwork | null>(null);
  const [picked, setPicked] = useState<Picked[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [current, setCurrent] = useState<AuditRow | null>(null);
  const auditId = useRef<string>(crypto.randomUUID());
  const uploaded = useRef<string[] | null>(null);
  const previews = useRef<string[]>([]);

  useEffect(() => () => previews.current.forEach((u) => URL.revokeObjectURL(u)), []);

  function addFiles(list: FileList | File[]) {
    setFileError(null);
    const next = [...picked];
    for (const file of Array.from(list)) {
      if (next.length >= MAX_FILES) {
        setFileError(`Maximum ${MAX_FILES} fichiers par audit.`);
        break;
      }
      const err = validateFile(file) ?? validateTotal([...next.map((p) => p.file.size), file.size]);
      if (err) {
        setFileError(`${file.name} : ${err}`);
        continue;
      }
      const preview = file.type.startsWith("image/") ? URL.createObjectURL(file) : null;
      if (preview) previews.current.push(preview);
      next.push({ file, preview });
    }
    uploaded.current = null; // la sélection a changé : il faudra renvoyer les fichiers
    auditId.current = crypto.randomUUID();
    setPicked(next);
  }

  function removeFile(i: number) {
    uploaded.current = null;
    auditId.current = crypto.randomUUID();
    setPicked((p) => p.filter((_, j) => j !== i));
  }

  async function run() {
    setError(null);
    setCurrent(null);
    if (picked.length === 0) return;
    if (!network) return setError("Choisissez d'abord le réseau à auditer.");
    setLoading(true);

    if (!uploaded.current) {
      const paths: string[] = [];
      for (let i = 0; i < picked.length; i++) {
        const f = picked[i].file;
        const path = `${brandId}/${auditId.current}/${storageName(i, f.name, f.type as keyof typeof ACCEPTED)}`;
        const { error: upErr } = await supabase.storage.from("audits").upload(path, f, { contentType: f.type, upsert: true });
        if (upErr) {
          setLoading(false);
          return setError(`L'envoi de « ${f.name} » a échoué. Vérifiez votre connexion et réessayez.`);
        }
        paths.push(path);
      }
      uploaded.current = paths;
    }

    const res = await callGenerate({ type: "audit", brand_profile_id: brandId, audit_id: auditId.current, files: uploaded.current, network });
    setLoading(false);
    if (!res.ok) return setError(res.error);

    const { report } = res.data as { id: string; report: unknown };
    const row: AuditRow = { id: auditId.current, created_at: new Date().toISOString(), report_data: report };
    setAudits((a) => [row, ...a]);
    setCurrent(row);
    setPicked([]);
    setNetwork(null);
    uploaded.current = null;
    auditId.current = crypto.randomUUID();
  }

  return (
    <section>
      <PageHeader tab="audit" />

      <fieldset className="mt-2">
        <legend className="label">Quel réseau voulez-vous auditer ?</legend>
        <p className="caption mb-3">Un audit analyse un seul réseau : vous obtenez un score et des priorités propres à ce réseau. Lancez un audit par réseau.</p>
        <div role="radiogroup" aria-label="Réseau à auditer" className="flex flex-wrap gap-2.5">
          {AUDIT_NETWORKS.map((n) => (
            <button key={n} type="button" role="radio" aria-checked={network === n} onClick={() => setNetwork(n)} className={`rounded-pill border px-4 py-2 text-[15px] font-medium transition ${network === n ? "border-accent bg-accent text-white shadow-glow" : "border-black/10 bg-white hover:border-accent/50"}`}>{n}</button>
          ))}
        </div>
      </fieldset>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}
        className={`group mt-6 flex cursor-pointer flex-col items-center justify-center rounded-[28px] border-2 border-dashed bg-white px-6 py-12 text-center shadow-card transition duration-300 ${dragging ? "scale-[1.01] border-accent bg-accent-soft/60" : "border-black/12 hover:border-accent/50 hover:bg-accent-soft/30"}`}
      >
        <input type="file" multiple accept="image/png,image/jpeg,application/pdf" className="sr-only" onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
        <span aria-hidden className="flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-accent transition duration-300 group-hover:scale-105"><UploadCloud size={30} strokeWidth={1.6} /></span>
        <span className="mt-5 text-[19px] font-semibold tracking-heading">{network ? `Déposez vos captures ${network} ou PDF ici` : "Déposez vos captures ou PDF ici"}</span>
        <span className="mt-1 text-[15px] text-ink-secondary">ou <span className="font-medium text-accent">parcourez vos fichiers</span></span>
        <span className="caption mt-3">PNG, JPG ou PDF · 10 Mo max par fichier · {MAX_FILES} fichiers et {formatMegabytes(MAX_TOTAL_BYTES)} au total, au maximum</span>
      </label>
      {fileError && <p role="alert" className="mt-3 text-[15px] text-danger">{fileError}</p>}

      {picked.length > 0 && <p className="caption mt-4">{picked.length} fichier{picked.length > 1 ? "s" : ""} · {formatMegabytes(picked.reduce((s, p) => s + p.file.size, 0))} sur {formatMegabytes(MAX_TOTAL_BYTES)}</p>}
      {picked.length > 0 && (
        <ul className="mt-3 flex flex-wrap gap-3" aria-label="Fichiers à analyser">
          {picked.map((p, i) => (
            <li key={i} className="relative w-28">
              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-btn border border-line bg-bg-secondary">
                {p.preview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview} alt={p.file.name} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[13px] font-semibold text-ink-secondary">PDF</span>
                )}
              </div>
              <p className="caption mt-1 truncate" title={p.file.name}>{p.file.name}</p>
              <button type="button" aria-label={`Retirer ${p.file.name}`} onClick={() => removeFile(i)} disabled={loading}
                className="absolute -right-2 -top-2 h-7 w-7 rounded-full border border-line bg-bg flex items-center justify-center shadow-sm hover:bg-bg-secondary"><X size={14} aria-hidden /></button>
            </li>
          ))}
        </ul>
      )}

      {error && <GenerateError message={error} onRetry={run} />}

      <button type="button" className="btn-primary mt-6" disabled={picked.length === 0 || !network || loading} onClick={run}>
        {loading ? "Analyse en cours…" : network ? `Lancer l'audit ${network}` : "Lancer l'audit"}
      </button>
      {picked.length > 0 && !network && <p className="caption mt-2">Choisissez le réseau ci-dessus pour lancer l&apos;audit.</p>}

      {current && (
        <div className="mt-10">
          <h2 className="section-title mb-5">Résultat de l&apos;audit</h2>
          <AuditReport data={current.report_data} />
        </div>
      )}

      <AuditTrend rows={audits} />

      <div className="mt-14">
        <h2 className="section-title">Historique des audits</h2>
        {audits.length === 0 ? (
          <div className="mt-4"><EmptyState illustration="audit" title="Aucun audit pour l’instant" text="Déposez vos captures ou PDF ci-dessus et lancez votre premier audit : le score apparaîtra ici." /></div>
        ) : (
          <ul className="mt-4 space-y-3">
            {audits.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => { setCurrent(a); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  className="card flex w-full items-center gap-4 text-left" aria-label={`Voir l'audit du ${dateFr(a.created_at)}`}>
                  <span className="text-[28px] font-semibold tracking-heading">{scoreOf(a.report_data) ?? "–"}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2 text-[15px] font-medium">{dateFr(a.created_at)}{networkOf(a.report_data) && <span className="chip">{networkOf(a.report_data)}</span>}</span>
                    <span className="block truncate text-[14px] text-ink-secondary">{summaryOf(a.report_data)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
