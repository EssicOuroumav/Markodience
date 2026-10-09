"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
  label: string;
};

/** Texte éditable en un clic ; sauvegarde à la perte de focus. */
export default function EditableText({ value, onSave, placeholder = "Cliquez pour écrire", multiline = false, className = "", label }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [seen, setSeen] = useState(value);
  // Resynchronise le brouillon quand la valeur change côté parent (sans effet).
  if (seen !== value) {
    setSeen(value);
    setDraft(value);
  }
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement>(null);

  /** Le champ prend la hauteur de son texte : tout le contenu reste visible pendant la modification. */
  const fit = (el: HTMLTextAreaElement | HTMLInputElement | null) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + (el.offsetHeight - el.clientHeight)}px`; // + bordures
  };

  useEffect(() => {
    if (!editing) return;
    const el = ref.current;
    el?.focus();
    fit(el);
  }, [editing]);

  const cancelled = useRef(false);
  function commit() {
    setEditing(false);
    if (cancelled.current) { cancelled.current = false; return; }
    if (draft !== value) onSave(draft);
  }

  if (!editing) {
    return (
      <button
        type="button"
        aria-label={`Modifier : ${label}`}
        onClick={() => setEditing(true)}
        className={`w-full whitespace-pre-wrap rounded-btn px-2 py-1 text-left transition hover:bg-black/5 ${value ? "" : "text-ink-secondary"} ${className}`}
      >
        {value || placeholder}
      </button>
    );
  }
  return (
    <textarea
      ref={ref as React.RefObject<HTMLTextAreaElement>}
      rows={1}
      value={draft}
      onChange={(e) => { setDraft(e.target.value); fit(e.target); }}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Escape") { cancelled.current = true; setDraft(value); setEditing(false); }
        else if (!multiline && e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur(); }
      }}
      aria-label={label}
      className={`input block resize-none overflow-hidden ${className}`}
    />
  );
}
