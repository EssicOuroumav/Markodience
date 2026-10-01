"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callGenerate } from "@/lib/api";
import EditableText from "./EditableText";
import GenerateError from "./GenerateError";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";

type Lists = { do_list: string[]; dont_list: string[] };

function ListColumn({ title, items, tone, onChange }: { title: string; items: string[]; tone: "do" | "dont"; onChange: (next: string[]) => void }) {
  return (
    <article className={`rounded-card p-6 ${tone === "do" ? "bg-success/10" : "bg-danger/10"}`}>
      <h2 className="text-[20px]">{title}</h2>
      <ul className="mt-3 space-y-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-1">
            <span aria-hidden className="mt-1 px-1">•</span>
            <div className="flex-1">
              <EditableText label={`${title} ${i + 1}`} value={it} onSave={(v) => onChange(v.trim() ? items.map((x, j) => (j === i ? v : x)) : items.filter((_, j) => j !== i))} />
            </div>
            <button type="button" aria-label={`Supprimer : ${it}`} className="rounded-btn px-2 text-ink-secondary hover:bg-black/5" onClick={() => onChange(items.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ul>
      <button type="button" className="btn-secondary mt-4" onClick={() => onChange([...items, "Nouvelle ligne"])}>+ Ajouter</button>
    </article>
  );
}

export default function ToneTab({ brandId, initial, hasIdentity }: { brandId: string; initial: Lists | null; hasIdentity: boolean }) {
  const supabase = createClient();
  const [lists, setLists] = useState<Lists | null>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");

  async function generate() {
    if (lists && !window.confirm("Regénérer remplacera la tonalité actuelle, y compris vos modifications. Continuer ?")) return;
    setLoading(true);
    setError(null);
    const res = await callGenerate({ type: "tone", brand_profile_id: brandId });
    setLoading(false);
    if (!res.ok) return setError(res.error);
    setLists(res.data as Lists);
  }

  async function persist(patch: Partial<Lists>) {
    const next = { ...(lists as Lists), ...patch };
    setLists(next);
    setSave("saving");
    const { error: err } = await supabase.from("tone_voice").update(patch).eq("brand_profile_id", brandId);
    setSave(err ? "error" : "saved");
  }

  if (!hasIdentity) {
    return (
      <section>
        <PageHeader tab="tone" />
        <EmptyState illustration="chat" title="Commencez par votre identité de marque" text="La tonalité découle de votre positionnement : générez d’abord votre identité.">
          <Link href="/dashboard/identity" className="btn-primary">Aller à l&apos;identité de marque</Link>
        </EmptyState>
      </section>
    );
  }

  return (
    <section>
      <PageHeader tab="tone"><SaveIndicator state={save} /></PageHeader>
      {lists ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          <ListColumn title="On dit / On fait" tone="do" items={lists.do_list ?? []} onChange={(v) => persist({ do_list: v })} />
          <ListColumn title="On évite / On ne fait pas" tone="dont" items={lists.dont_list ?? []} onChange={(v) => persist({ dont_list: v })} />
        </div>
      ) : (
        <div className="mt-6"><EmptyState illustration="chat" title="Aucune tonalité définie" text="Générez la voix de votre marque à partir de votre identité : ce qu’on dit, et ce qu’on évite." /></div>
      )}
      {error && <GenerateError message={error} onRetry={generate} />}
      <button type="button" className="btn-primary mt-8" onClick={generate} disabled={loading}>
        {loading ? "Génération en cours…" : lists ? "Regénérer ma tonalité" : "Générer ma tonalité de marque"}
      </button>
    </section>
  );
}
