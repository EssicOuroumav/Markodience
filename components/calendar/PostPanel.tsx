"use client";

import { Check, ClipboardCopy, ExternalLink, Sparkles, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NEXT_STEP, POST_FORMATS, POST_STATUSES, POST_STATUS_LABEL, STATUS_CLS, postCopyText, type Post, type PostStatus } from "@/lib/posts";
import { cleanUrl } from "@/lib/brandInfo";
import EditableText from "../EditableText";

const NETWORKS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "WhatsApp", "Site web"];

/** Fiche complète d'une publication, dans un panneau latéral : tout se modifie en place. */
export default function PostPanel({ post, onClose, onPatch, onDelete, onWrite, writing }: {
  post: Post; onClose: () => void; onPatch: (id: string, p: Partial<Post>) => void; onDelete: (id: string) => void; onWrite: (p: Post) => void; writing: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  const next = NEXT_STEP[post.status];

  async function copy() {
    try { await navigator.clipboard.writeText(postCopyText(post)); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* presse-papiers indisponible */ }
  }
  function saveLink(v: string) {
    const url = cleanUrl(v);
    if (url === "invalid") return setLinkError("Adresse non valide (exemple : canva.com/design/…).");
    setLinkError(null);
    onPatch(post.id, { design_link: url });
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Fiche de la publication">
      <button type="button" aria-label="Fermer" className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-[560px] flex-col overflow-y-auto bg-white p-6 shadow-pop">
        <div className="flex items-center justify-between gap-3">
          <span className={`rounded-pill px-3 py-1 text-[13px] font-semibold ${STATUS_CLS[post.status]}`}>{POST_STATUS_LABEL[post.status]}</span>
          <button type="button" className="btn-ghost !px-2" aria-label="Fermer la fiche" onClick={onClose}><X size={18} /></button>
        </div>

        {post.review_note && post.status === "brouillon" && (
          <p className="mt-4 rounded-2xl border border-warning/40 bg-warning/15 p-3.5 text-[14px]"><span className="font-semibold">Retour du validateur :</span> {post.review_note}</p>
        )}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div><label className="caption block px-1" htmlFor="pp-date">Date</label><input id="pp-date" type="date" className="input !py-1.5" value={post.scheduled_date ?? ""} onChange={(e) => onPatch(post.id, { scheduled_date: e.target.value || null })} /></div>
          <div><label className="caption block px-1" htmlFor="pp-net">Réseau</label><select id="pp-net" className="input !py-1.5" value={post.channel ?? ""} onChange={(e) => onPatch(post.id, { channel: e.target.value || null })}><option value="">—</option>{NETWORKS.map((n) => <option key={n}>{n}</option>)}</select></div>
          <div><label className="caption block px-1" htmlFor="pp-format">Format</label><select id="pp-format" className="input !py-1.5" value={post.format ?? ""} onChange={(e) => onPatch(post.id, { format: e.target.value || null })}><option value="">—</option>{[...POST_FORMATS, ...(post.format && !(POST_FORMATS as readonly string[]).includes(post.format) ? [post.format] : [])].map((f) => <option key={f}>{f}</option>)}</select></div>
          <div><label className="caption block px-1" htmlFor="pp-status">Statut</label><select id="pp-status" className="input !py-1.5" value={post.status} onChange={(e) => onPatch(post.id, { status: e.target.value as PostStatus })}>{POST_STATUSES.map((s) => <option key={s} value={s}>{POST_STATUS_LABEL[s]}</option>)}</select></div>
        </div>
        <div className="mt-3"><label className="caption block px-1" htmlFor="pp-owner">Responsable</label><input id="pp-owner" className="input !py-1.5" maxLength={120} placeholder="Qui produit ou valide cette publication ?" defaultValue={post.assignee ?? ""} onBlur={(e) => e.target.value !== (post.assignee ?? "") && onPatch(post.id, { assignee: e.target.value.trim() || null })} /></div>

        {(post.idea || post.hook) && (
          <div className="mt-4 rounded-2xl bg-canvas p-3 text-[14px]">
            <div className="flex flex-wrap gap-1.5">{post.pillar && <span className="rounded-pill bg-white px-2.5 py-0.5 text-[12px] font-medium">{post.pillar}</span>}</div>
            <EditableText multiline label="Idée du plan" className="mt-1 text-[14px]" value={post.idea ?? ""} onSave={(v) => onPatch(post.id, { idea: v })} />
            <EditableText label="Accroche" className="text-[14px] font-semibold" value={post.hook ?? ""} onSave={(v) => onPatch(post.id, { hook: v })} />
          </div>
        )}

        {!post.caption && (post.idea || post.hook) ? (
          <button type="button" className="btn-primary mt-4" disabled={writing} onClick={() => onWrite(post)}><Sparkles size={16} />{writing ? "Rédaction…" : "Rédiger la légende avec l'IA"}</button>
        ) : null}
        <div className="mt-3 space-y-1">
          <p className="caption px-2 font-semibold uppercase tracking-[0.08em]">Légende</p>
          <EditableText multiline label="Légende" className="text-[15px] leading-relaxed" placeholder="Écrivez la légende" value={post.caption} onSave={(v) => onPatch(post.id, { caption: v })} />
          <p className="caption px-2 pt-1 font-semibold uppercase tracking-[0.08em]">Idée de visuel</p>
          <EditableText multiline label="Idée de visuel" className="text-[14px] text-ink-secondary" placeholder="Décrivez le visuel" value={post.visual_idea} onSave={(v) => onPatch(post.id, { visual_idea: v })} />
          <p className="caption px-2 pt-1 font-semibold uppercase tracking-[0.08em]">Appel à l&apos;action et hashtags</p>
          <EditableText multiline label="Appel à l'action" className="text-[14px]" placeholder="Appel à l'action" value={post.call_to_action} onSave={(v) => onPatch(post.id, { call_to_action: v })} />
          <EditableText label="Hashtags" className="text-[14px] text-accent" placeholder="#hashtags" value={post.hashtags} onSave={(v) => onPatch(post.id, { hashtags: v })} />
        </div>

        <div className="mt-3">
          <label className="caption block px-1" htmlFor="pp-link">Lien du visuel <span className="font-normal">(Canva, Figma, Drive…)</span></label>
          <div className="flex items-center gap-2">
            <input id="pp-link" className="input !py-1.5" placeholder="canva.com/design/…" defaultValue={post.design_link ?? ""} onBlur={(e) => saveLink(e.target.value)} />
            {post.design_link && <a href={post.design_link} target="_blank" rel="noopener noreferrer" className="btn-secondary !px-3 !py-1.5" aria-label="Ouvrir le visuel"><ExternalLink size={15} /></a>}
          </div>
          {linkError && <p className="mt-1 text-[13px] text-danger">{linkError}</p>}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-2 border-t hairline pt-4">
          {next && <button type="button" className="btn-primary" onClick={() => onPatch(post.id, { status: next.to })}>{next.label}</button>}
          {post.status === "a_valider" && <button type="button" className="btn-secondary" onClick={() => onPatch(post.id, { status: "brouillon" })}>Retour en brouillon</button>}
          <button type="button" className="btn-secondary" onClick={copy}>{copied ? <Check size={16} /> : <ClipboardCopy size={16} />}{copied ? "Copié" : "Copier le texte"}</button>
          <button type="button" className="btn-ghost ml-auto text-danger" onClick={() => onDelete(post.id)}><Trash2 size={16} />Supprimer</button>
        </div>
      </div>
    </div>
  );
}
