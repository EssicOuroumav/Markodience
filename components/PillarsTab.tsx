"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { callGenerate } from "@/lib/api";
import EditableText from "./EditableText";
import GenerateError from "./GenerateError";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

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
      <section className="card">
        <h1 className="text-[28px]">Piliers de contenu</h1>
        <p className="mt-2 text-ink-secondary">Les piliers s&apos;appuient sur votre identité de marque. Générez-la d&apos;abord.</p>
        <a href="/dashboard/identity" className="btn-primary mt-6">Aller à l&apos;identité de marque</a>
      </section>
    );
  }

  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-[28px]">Piliers de contenu</h1>
        <SaveIndicator state={save} />
      </div>
      {pillars.length === 0 ? (
        <div className="card mt-6">
          <p className="text-ink-secondary">Aucun pilier pour l&apos;instant. Générez-en 3 à 5 à partir de votre identité, ou ajoutez-les à la main.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {pillars.map((p) => (
            <article key={p.id} className="card flex flex-col">
              <EditableText label="Nom du pilier" className="text-[20px] font-semibold" value={p.name ?? ""} onSave={(v) => update(p.id, { name: v })} />
              <EditableText multiline label="Description du pilier" className="mt-1 text-[15px]" value={p.description ?? ""} onSave={(v) => update(p.id, { description: v })} />
              <h3 className="mt-4 text-[13px] uppercase tracking-wide text-ink-secondary">Exemples de formats</h3>
              <EditableText
                multiline
                label="Exemples de formats (un par ligne)"
                className="text-[15px]"
                placeholder="Un exemple par ligne"
                value={(p.examples ?? []).join("\n")}
                onSave={(v) => update(p.id, { examples: v.split("\n").map((x) => x.trim()).filter(Boolean) })}
              />
              <button type="button" className="btn-secondary mt-4 self-start" onClick={() => remove(p.id)}>Supprimer</button>
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
