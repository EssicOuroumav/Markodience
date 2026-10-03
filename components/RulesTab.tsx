"use client";

import { Ban, BarChart3, CalendarClock, ChevronDown, Image as ImageIcon, List, MessageCircle, ShieldCheck, Wand2 } from "lucide-react";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { RULE_HINTS, RULE_SECTIONS, RULE_TEMPLATES, type RuleKey } from "@/lib/rules";
import MarkdownView from "./MarkdownView";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PageHeader from "./PageHeader";

const ICONS = { planning: CalendarClock, visual: ImageIcon, community: MessageCircle, reporting: BarChart3, privacy: ShieldCheck, taboo: Ban } as const;

function Section({ brandId, k, label, initial, defaultOpen, onSave }: { brandId: string; k: RuleKey; label: string; initial: string; defaultOpen: boolean; onSave: (s: SaveState) => void }) {
  const supabase = createClient();
  const [open, setOpen] = useState(defaultOpen);
  const [editing, setEditing] = useState(false);
  const [content, setContent] = useState(initial);
  const ta = useRef<HTMLTextAreaElement>(null);
  const lastSaved = useRef(initial);

  async function persist(value: string) {
    if (value === lastSaved.current) return;
    onSave("saving");
    const { error } = await supabase.from("operational_rules").upsert({ brand_profile_id: brandId, section: k, content: value }, { onConflict: "brand_profile_id,section" });
    if (!error) lastSaved.current = value;
    onSave(error ? "error" : "saved");
  }

  function wrap(before: string, after = before) {
    const el = ta.current;
    if (!el) return;
    const { selectionStart: s, selectionEnd: e, value } = el;
    const next = value.slice(0, s) + before + (value.slice(s, e) || "texte") + after + value.slice(e);
    setContent(next);
  }
  function bullet() {
    const el = ta.current;
    if (!el) return;
    const s = el.selectionStart;
    const lineStart = el.value.lastIndexOf("\n", s - 1) + 1;
    setContent(el.value.slice(0, lineStart) + "- " + el.value.slice(lineStart));
  }

  return (
    <div className="card-flat !p-0 overflow-hidden">
      <h2>
        <button type="button" aria-expanded={open} aria-controls={`rules-${k}`} onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center gap-4 px-6 py-5 text-left text-[18px] font-semibold tracking-heading transition hover:bg-canvas/60">
          <span aria-hidden className={`flex h-11 w-11 items-center justify-center rounded-2xl ${open ? "bg-accent text-white" : "bg-accent-soft text-accent"} transition`}>{(() => { const I = ICONS[k]; return <I size={20} strokeWidth={1.8} />; })()}</span>
          <span className="flex-1"><span className="block">{label}</span><span className="block text-[13px] font-normal tracking-normal text-ink-secondary">{RULE_HINTS[k]}</span></span>
          <ChevronDown size={20} aria-hidden className={`text-ink-secondary transition duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
      </h2>
      {open && (
        <div id={`rules-${k}`} className="border-t hairline px-6 pb-6 pt-4">
          {editing ? (
            <>
              <div className="mb-2 flex gap-2" role="toolbar" aria-label="Mise en forme">
                <button type="button" className="btn-secondary !px-3 !py-1.5 font-bold" aria-label="Gras" onMouseDown={(e) => e.preventDefault()} onClick={() => wrap("**")}>G</button>
                <button type="button" className="btn-secondary !px-3 !py-1.5 italic" aria-label="Italique" onMouseDown={(e) => e.preventDefault()} onClick={() => wrap("*")}>I</button>
                <button type="button" className="btn-secondary !px-3 !py-1.5" aria-label="Liste à puces" onMouseDown={(e) => e.preventDefault()} onClick={bullet}><span className="inline-flex items-center gap-1.5"><List size={15} aria-hidden />Liste</span></button>
              </div>
              <textarea ref={ta} autoFocus rows={8} className="input" aria-label={label} value={content} onChange={(e) => setContent(e.target.value)}
                onBlur={() => { setEditing(false); persist(content); }} />
              <p className="caption mt-1">**gras**, *italique*, « - » pour une liste. Enregistrement automatique en quittant le champ.</p>
            </>
          ) : (
            <button type="button" onClick={() => setEditing(true)} aria-label={`Modifier : ${label}`}
              className="w-full rounded-btn p-2 text-left transition hover:bg-black/5">
              {content.trim() ? <MarkdownView source={content} /> : <span className="text-ink-secondary">Aucune règle définie pour cette section — cliquez pour commencer à écrire</span>}
            </button>
          )}
          {!editing && !content.trim() && (
            <button type="button" className="btn-secondary mt-3" onClick={() => { const t = RULE_TEMPLATES[k]; setContent(t); persist(t); }}>
              <Wand2 size={16} />Insérer un modèle à adapter
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function RulesTab({ brandId, initial }: { brandId: string; initial: Record<string, string> }) {
  const [save, setSave] = useState<SaveState>("idle");
  return (
    <section>
      <PageHeader tab="rules" description="Le règlement interne de la marque : comment on planifie, on crée, on répond, on rend compte et on protège les données. Un repère partagé pour toute l’équipe et le client."><SaveIndicator state={save} /></PageHeader>
      <div className="mt-6 space-y-3">
        {RULE_SECTIONS.map((s, i) => (
          <Section key={s.key} brandId={brandId} k={s.key} label={s.label} initial={initial[s.key] ?? ""} defaultOpen={i === 0} onSave={setSave} />
        ))}
      </div>
    </section>
  );
}
