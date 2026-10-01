"use client";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callGenerate } from "@/lib/api";
import EditableText from "./EditableText";
import GenerateError from "./GenerateError";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";

export type Pillar = { id: string; name: string | null; description: string | null; examples: string[] | null };

export default function PillarsTab({ brandId, initial, hasIdentity }: { brandId: string; initial: Pillar[]; hasIdentity: boolean }) {
  const supabase = createClient();
  const [pillars, setPillars] = useState<Pillar[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");

  async function reload() {
    const { data } = await supabase.from("content_pillars").select("id, name, description, examples").eq("brand_profile_id", brandId);
    setPillars((data as Pillar[]) ?? []);
  }

  async function generate() {
    if (pillars.length > 0 && !window.confirm("Regénérer remplacera vos piliers actuels, y compris vos modifications. Continuer ?")) return;
    setLoading(true);
    setError(null);
    const res = await callGenerate({ type: "pillars", brand_profile_id: brandId });
    if (!res.ok) {
      setLoading(false);
      return setError(res.error);
    }
    await reload();
    setLoading(false);
  }

  async function update(id: string, patch: Partial<Pillar>) {
    setPillars((ps) => ps.map((p) => (p.id === id ? { ...p, ...patch } : p)));
    setSave("saving");
    const { error: err } = await supabase.from("content_pillars").update(patch).eq("id", id);
    setSave(err ? "error" : "saved");
  }

  async function add() {
    setSave("saving");
    const { data, error: err } = await supabase
      .from("content_pillars")
      .insert({ brand_profile_id: brandId, name: "Nouveau pilier", description: "", examples: [] })
      .select("id, name, description, examples")
      .single();
    if (err || !data) return setSave("error");
    setPillars((ps) => [...ps, data as Pillar]);
    setSave("saved");
  }

  async function remove(id: string) {
    if (!window.confirm("Supprimer ce pilier ?")) return;
    setSave("saving");
    const { error: err } = await supabase.from("content_pillars").delete().eq("id", id);
    if (err) return setSave("error");
    setPillars((ps) => ps.filter((p) => p.id !== id));
    setSave("saved");
  }

  if (!hasIdentity) {
    return (
      <section>
        <PageHeader tab="pillars" />
        <EmptyState illustration="pillars" title="Commencez par votre identité de marque" text="Les piliers de contenu s’appuient sur votre positionnement : générez d’abord votre identité.">
          <Link href="/dashboard/identity" className="btn-primary">Aller à l&apos;identité de marque</Link>
        </EmptyState>
      </section>
    );
  }

  return (
    <section>
      <PageHeader tab="pillars"><SaveIndicator state={save} /></PageHeader>
      {pillars.length === 0 ? (
        <div className="mt-6"><EmptyState illustration="pillars" title="Aucun pilier pour l’instant" text="Générez 3 à 5 piliers à partir de votre identité, ou ajoutez-les à la main avec le bouton « + »." /></div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p, i) => (
            <article key={p.id} className="card group relative flex flex-col overflow-hidden">
              <span aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent to-[#5aa9ff] opacity-80" />
              <span aria-hidden className="num mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-[14px] font-semibold text-accent">{String(i + 1).padStart(2, "0")}</span>
              <EditableText label="Nom du pilier" className="text-[20px] font-semibold" value={p.name ?? ""} onSave={(v) => update(p.id, { name: v })} />
              <EditableText multiline label="Description du pilier" className="mt-1 text-[15px]" value={p.description ?? ""} onSave={(v) => update(p.id, { description: v })} />
              <h3 className="mt-5 border-t hairline pt-4 text-[12px] font-semibold uppercase tracking-[0.1em] text-ink-secondary">Exemples de formats</h3>
              <EditableText
                multiline
                label="Exemples de formats (un par ligne)"
                className="text-[15px]"
                placeholder="Un exemple par ligne"
                value={(p.examples ?? []).join("\n")}
                onSave={(v) => update(p.id, { examples: v.split("\n").map((x) => x.trim()).filter(Boolean) })}
              />
              <button type="button" className="btn-ghost mt-3 self-start !px-3 text-[14px] text-ink-secondary hover:text-danger" onClick={() => remove(p.id)}><Trash2 size={15} />Supprimer</button>
            </article>
          ))}
        </div>
      )}
      {error && <GenerateError message={error} onRetry={generate} />}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <button type="button" className="btn-primary" onClick={generate} disabled={loading}>
          {loading ? "Génération en cours…" : pillars.length ? "Regénérer mes piliers" : "Générer mes piliers de contenu"}
        </button>
        <button type="button" className="btn-secondary" onClick={add} aria-label="Ajouter un pilier">+ Ajouter un pilier</button>
      </div>
    </section>
  );
}
