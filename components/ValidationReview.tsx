"use client";

import { Check, ExternalLink, MessageSquareWarning } from "lucide-react";
import { useState } from "react";
import type { ReviewPost } from "@/lib/validationServer";

const STATUS: Record<string, string> = { brouillon: "Retournée pour modifications", a_valider: "En attente de votre décision", programme: "Approuvée", publie: "Publiée" };

/** Relecture d'une série de publications par un validateur externe : Approuver, ou Demander des modifications avec un commentaire. */
export default function ValidationReview({ token, posts: initial }: { token: string; posts: ReviewPost[] }) {
  const [posts, setPosts] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});

  async function decide(id: string, decision: "approuve" | "modifs") {
    setError(null);
    setBusy(id);
    try {
      const res = await fetch("/api/validation/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, post_id: id, decision, comment: decision === "modifs" ? comment : "" }) });
      const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string } | null;
      if (!json?.ok) return setError(json?.error ?? "La décision n'a pas pu être envoyée. Réessayez.");
      setPosts((ps) => ps.map((p) => (p.id === id ? { ...p, status: decision === "approuve" ? "programme" : "brouillon" } : p)));
      setDone((d) => ({ ...d, [id]: decision === "approuve" ? "Merci, c'est approuvé." : "Merci, vos modifications sont envoyées." }));
      setOpen(null);
      setComment("");
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 space-y-5">
      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-5 py-3.5 text-[15px]">{error}</p>}
      {posts.map((p) => (
        <article key={p.id} className="card-flat">
          <div className="flex flex-wrap items-center gap-2">
            {p.channel && <span className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-[12px] font-semibold text-accent">{p.channel}</span>}
            {p.format && <span className="rounded-pill bg-canvas px-2.5 py-0.5 text-[12px] text-ink-secondary">{p.format}</span>}
            {p.scheduled_date && <span className="caption">Prévue le {new Date(p.scheduled_date + "T00:00:00").toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</span>}
            <span className="ml-auto rounded-pill bg-black/[0.06] px-2.5 py-0.5 text-[12px] font-medium">{STATUS[p.status] ?? p.status}</span>
          </div>
          <p className="mt-3 whitespace-pre-wrap text-[16px] leading-relaxed">{p.caption || <span className="text-ink-secondary">Légende pas encore rédigée.</span>}</p>
          {(p.call_to_action || p.hashtags) && <p className="mt-2 text-[14px] text-ink-secondary">{[p.call_to_action, p.hashtags].filter(Boolean).join(" · ")}</p>}
          {p.visual_idea && <p className="mt-3 rounded-xl bg-canvas p-3 text-[14px]"><span className="font-semibold">Visuel :</span> {p.visual_idea}</p>}
          {p.design_link && <a href={p.design_link} target="_blank" rel="noopener noreferrer" className="mt-2 inline-flex items-center gap-1.5 text-[14px] font-medium text-accent">Voir le visuel <ExternalLink size={13} /></a>}
          {done[p.id] ? (
            <p className="mt-4 flex items-center gap-2 rounded-2xl bg-success/12 px-4 py-3 text-[15px]"><Check size={16} className="text-success" />{done[p.id]}</p>
          ) : p.status === "a_valider" ? (
            <div className="mt-4">
              {open === p.id ? (
                <div className="space-y-2">
                  <label className="label" htmlFor={`c-${p.id}`}>Que faut-il modifier ?</label>
                  <textarea id={`c-${p.id}`} rows={3} maxLength={1000} className="input" value={comment} onChange={(e) => setComment(e.target.value)} />
                  <div className="flex gap-2"><button type="button" className="btn-primary" disabled={busy === p.id} onClick={() => decide(p.id, "modifs")}>Envoyer mes modifications</button><button type="button" className="btn-secondary" onClick={() => { setOpen(null); setComment(""); }}>Annuler</button></div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" disabled={busy === p.id} onClick={() => decide(p.id, "approuve")}><Check size={16} />Approuver</button>
                  <button type="button" className="btn-secondary" onClick={() => { setOpen(p.id); setComment(""); }}><MessageSquareWarning size={16} />Demander des modifications</button>
                </div>
              )}
            </div>
          ) : null}
        </article>
      ))}
    </div>
  );
}
