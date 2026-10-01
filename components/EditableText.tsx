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

  useEffect(() => {
    if (editing) ref.current?.focus();
  }, [editing]);

  function commit() {
    setEditing(false);
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
  const common = {
    value: draft,
    onChange: (e: React.ChangeEvent<HTMLTextAreaElement & HTMLInputElement>) => setDraft(e.target.value),
    onBlur: commit,
    "aria-label": label,
    className: `input ${className}`,
  };
  return multiline ? (
    <textarea ref={ref as React.RefObject<HTMLTextAreaElement>} rows={4} {...common} />
  ) : (
    <input
      ref={ref as React.RefObject<HTMLInputElement>}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      {...common}
    />
  );
}
