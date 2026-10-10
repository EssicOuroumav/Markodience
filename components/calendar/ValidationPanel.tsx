"use client";

import { Check, ClipboardCopy, Link2, Send, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { EXPIRY_CHOICES, requestState } from "@/lib/validation";
import { postTitle, type Post } from "@/lib/posts";

type Req = { id: string; reviewer: string; post_ids: string[]; expires_at: string; revoked_at: string | null; created_at: string };

/** Envoi de publications « À valider » à un validateur sans compte (graphiste, direction, client), par un lien secret. */
export default function ValidationPanel({ brandId, pending, onClose }: { brandId: string; pending: Post[]; onClose: () => void }) {
  const [selected, setSelected] = useState<string[]>(pending.map((p) => p.id));
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [days, setDays] = useState<number>(7);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<Req[]>([]);

  const [tick, setTick] = useState(0);
  const reloadHistory = () => setTick((t) => t + 1);
  useEffect(() => {
    let alive = true;
    createClient().from("validation_requests").select("id, reviewer, post_ids, expires_at, revoked_at, created_at").eq("brand_profile_id", brandId).order("created_at", { ascending: false }).limit(8)
      .then(({ data }) => { if (alive) setHistory((data as Req[]) ?? []); });
    return () => { alive = false; };
  }, [brandId, tick]);

  async function create() {
    setError(null);
    if (selected.length === 0) return setError("Choisissez au moins une publication.");
    if (!reviewer.trim()) return setError("Indiquez le nom du validateur.");
    setBusy(true);
    const res = await fetch("/api/validation/create", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ post_ids: selected, reviewer: reviewer.trim(), note: note.trim(), days }) });
    const json = (await res.json().catch(() => null)) as { ok?: boolean; url?: string; error?: string } | null;
    setBusy(false);
    if (!json?.ok || !json.url) return setError(json?.error ?? "Le lien n'a pas pu être créé.");
    setLink(json.url);
    reloadHistory();
  }

  async function revoke(id: string) {
    await fetch("/api/validation/revoke", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    reloadHistory();
  }

  async function copy() {
    if (!link) return;
    try { await navigator.clipboard.writeText(link); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* presse-papiers indisponible */ }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Envoyer pour validation">
      <button type="button" aria-label="Fermer" className="fixed inset-0 bg-black/30" onClick={onClose} />
      <div className="relative w-full max-w-xl rounded-3xl bg-white p-6 shadow-pop">
        <div className="flex items-center justify-between"><h2 className="text-[22px]">Envoyer pour validation</h2><button type="button" className="btn-ghost !px-2" aria-label="Fermer" onClick={onClose}><X size={18} /></button></div>
        {link ? (
          <div className="mt-4 space-y-3">
            <p className="text-[15px]">Le lien est prêt. Il ne s&apos;affichera plus : copiez-le et envoyez-le à <strong>{reviewer}</strong>. Il fonctionne sans compte et expire dans {days} jours.</p>
            <input readOnly aria-label="Lien de validation" className="input" value={link} onFocus={(e) => e.currentTarget.select()} />
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-primary" onClick={copy}>{copied ? <Check size={16} /> : <ClipboardCopy size={16} />}{copied ? "Copié" : "Copier le lien"}</button>
              <a className="btn-secondary" target="_blank" rel="noopener noreferrer" href={`https://wa.me/?text=${encodeURIComponent(`Bonjour ${reviewer}, merci de relire ces publications : ${link}`)}`}><Send size={16} />Envoyer sur WhatsApp</a>
            </div>
          </div>
        ) : pending.length === 0 ? (
          <p className="mt-4 text-[15px] text-ink-secondary">Aucune publication n&apos;est « À valider ». Ouvrez une publication et choisissez « Demander la validation ».</p>
        ) : (
          <div className="mt-4 space-y-4">
            <div>
              <p className="label">Publications à relire</p>
              <ul className="max-h-48 space-y-1.5 overflow-y-auto rounded-2xl border border-black/10 p-2">
                {pending.map((p) => (
                  <li key={p.id}><label className="flex cursor-pointer items-start gap-2.5 rounded-xl px-2 py-1.5 hover:bg-canvas">
                    <input type="checkbox" className="mt-1 h-4 w-4 accent-[var(--color-accent)]" checked={selected.includes(p.id)} onChange={() => setSelected((s) => (s.includes(p.id) ? s.filter((x) => x !== p.id) : [...s, p.id]))} />
                    <span className="min-w-0 text-[14px]"><span className="caption">{p.channel} · {p.scheduled_date ?? "sans date"}</span><br />{postTitle(p)}</span>
                  </label></li>
                ))}
              </ul>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_150px]">
              <div><label className="label" htmlFor="vr-name">Validateur</label><input id="vr-name" className="input" maxLength={120} placeholder="Ex. : Mme la Directrice, le graphiste" value={reviewer} onChange={(e) => setReviewer(e.target.value)} /></div>
              <div><label className="label" htmlFor="vr-days">Lien valable</label><select id="vr-days" className="input" value={days} onChange={(e) => setDays(Number(e.target.value))}>{EXPIRY_CHOICES.map((d) => <option key={d} value={d}>{d} jours</option>)}</select></div>
            </div>
            <div><label className="label" htmlFor="vr-note">Message <span className="font-normal text-ink-secondary">(facultatif)</span></label><textarea id="vr-note" rows={2} maxLength={1000} className="input" value={note} onChange={(e) => setNote(e.target.value)} /></div>
            {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[15px]">{error}</p>}
            <button type="button" className="btn-primary" disabled={busy} onClick={create}><Link2 size={16} />{busy ? "Création…" : "Créer le lien de validation"}</button>
          </div>
        )}
        {history.length > 0 && (
          <div className="mt-6 border-t hairline pt-4">
            <p className="caption font-semibold uppercase tracking-[0.08em]">Liens déjà envoyés</p>
            <ul className="mt-2 space-y-1.5">
              {history.map((h) => {
                const st = requestState(h);
                return (
                  <li key={h.id} className="flex items-center gap-2 text-[14px]">
                    <span className="min-w-0 flex-1 truncate">{h.reviewer} · {h.post_ids.length} publication{h.post_ids.length > 1 ? "s" : ""}</span>
                    <span className={`rounded-pill px-2 py-0.5 text-[12px] ${st === "ok" ? "bg-success/20" : "bg-black/[0.07] text-ink-secondary"}`}>{st === "ok" ? `jusqu'au ${new Date(h.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}` : st === "expired" ? "expiré" : "désactivé"}</span>
                    {st === "ok" && <button type="button" className="text-[13px] font-medium text-danger" onClick={() => revoke(h.id)}>Désactiver</button>}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
