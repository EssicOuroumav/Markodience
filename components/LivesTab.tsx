"use client";

import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notifyProgress } from "@/lib/progressEvents";
import { callGenerate } from "@/lib/api";
import { OBJECTIVES, OBJECTIVE_LABELS, moveItem, type LiveStep, type Objective } from "@/lib/lives";
import EditableText from "./EditableText";
import GenerateError from "./GenerateError";
import SaveIndicator, { type SaveState } from "./SaveIndicator";
import PageHeader from "./PageHeader";
import EmptyState from "./EmptyState";

export type Guide = { id: string; objective: Objective; structure_data: { steps?: LiveStep[] } | null };
export type Member = { id: string; name: string; role: string | null; channel: string | null; rotation_week: number | null };
export type Script = { id: string; live_guide_id: string; situation: string | null; content: string | null; is_quick_reply: boolean | null };

export default function LivesTab({
  brandId, enabled: initialEnabled, initialGuides, initialMembers, initialScripts,
}: { brandId: string; enabled: boolean; initialGuides: Guide[]; initialMembers: Member[]; initialScripts: Script[] }) {
  const supabase = createClient();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [guides, setGuides] = useState<Guide[]>(initialGuides);
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [scripts, setScripts] = useState<Script[]>(initialScripts);
  const [activeId, setActiveId] = useState<string | null>(initialGuides[0]?.id ?? null);
  const [menu, setMenu] = useState(false);
  const [picking, setPicking] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [save, setSave] = useState<SaveState>("idle");
  const [copied, setCopied] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => menuRef.current && !menuRef.current.contains(e.target as Node) && setMenu(false);
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const guide = guides.find((g) => g.id === activeId) ?? null;
  const steps = guide?.structure_data?.steps ?? [];
  const guideScripts = scripts.filter((s) => s.live_guide_id === activeId);
  const usedObjectives = guides.map((g) => g.objective);
  const freeObjectives = OBJECTIVES.filter((o) => !usedObjectives.includes(o));

  async function enable() {
    const { error: err } = await supabase.from("brand_profiles").update({ lives_enabled: true }).eq("id", brandId);
    if (err) return setError("L'activation a échoué. Réessayez.");
    setEnabled(true);
  }

  async function createGuide(objective: Objective) {
    setError(null);
    const { data, error: err } = await supabase.from("live_guides").insert({ brand_profile_id: brandId, objective }).select("id, objective, structure_data").single();
    if (err || !data) return setError("Le guide n'a pas pu être créé.");
    setGuides((g) => [...g, data as Guide]);
    notifyProgress();
    setActiveId(data.id);
    setPicking(false);
    setMenu(false);
  }

  async function reloadGuide() {
    if (!activeId) return;
    const [{ data: g }, { data: sc }] = await Promise.all([
      supabase.from("live_guides").select("id, objective, structure_data").eq("id", activeId).single(),
      supabase.from("live_scripts").select("id, live_guide_id, situation, content, is_quick_reply").eq("live_guide_id", activeId),
    ]);
    if (g) setGuides((gs) => gs.map((x) => (x.id === activeId ? (g as Guide) : x)));
    setScripts((all) => [...all.filter((s) => s.live_guide_id !== activeId), ...((sc as Script[]) ?? [])]);
  }

  async function generate(type: "live_structure" | "live_scripts" | "live_step", extra: object = {}, key = type as string) {
    if (!guide) return;
    setBusy(key);
    setError(null);
    const res = await callGenerate({ type, live_guide_id: guide.id, ...extra });
    if (!res.ok) {
      setBusy(null);
      return setError(res.error);
    }
    await reloadGuide();
    setBusy(null);
  }

  async function saveSteps(next: LiveStep[]) {
    if (!guide) return;
    setGuides((gs) => gs.map((g) => (g.id === guide.id ? { ...g, structure_data: { steps: next } } : g)));
    setSave("saving");
    const { error: err } = await supabase.from("live_guides").update({ structure_data: { steps: next } }).eq("id", guide.id);
    setSave(err ? "error" : "saved");
  }

  async function addMember(name: string, role: string, channel: string, week: string) {
    const rotation = week.trim() ? Math.max(1, Math.floor(Number(week)) || 1) : null;
    const { data, error: err } = await supabase.from("live_team_members")
      .insert({ brand_profile_id: brandId, name, role: role || null, channel: channel || null, rotation_week: rotation })
      .select("id, name, role, channel, rotation_week").single();
    if (err || !data) return setSave("error");
    setMembers((m) => [...m, data as Member]);
  }
  async function removeMember(id: string) {
    if (!window.confirm("Retirer ce membre de l'équipe ?")) return;
    const { error: err } = await supabase.from("live_team_members").delete().eq("id", id);
    if (!err) setMembers((m) => m.filter((x) => x.id !== id));
  }

  async function patchScript(id: string, patch: Partial<Script>) {
    setScripts((all) => all.map((s) => (s.id === id ? { ...s, ...patch } : s)));
    setSave("saving");
    const { error: err } = await supabase.from("live_scripts").update(patch).eq("id", id);
    setSave(err ? "error" : "saved");
  }
  async function addScript(quick: boolean) {
    if (!guide) return;
    const { data, error: err } = await supabase.from("live_scripts")
      .insert({ live_guide_id: guide.id, situation: quick ? "Nouvelle réponse rapide" : "Nouvelle situation", content: "", is_quick_reply: quick })
      .select("id, live_guide_id, situation, content, is_quick_reply").single();
    if (err || !data) return setSave("error");
    setScripts((all) => [...all, data as Script]);
  }
  async function removeScript(id: string) {
    const { error: err } = await supabase.from("live_scripts").delete().eq("id", id);
    if (!err) setScripts((all) => all.filter((s) => s.id !== id));
  }
  async function copy(s: Script) {
    try {
      await navigator.clipboard.writeText(s.content ?? "");
      setCopied(s.id);
      setTimeout(() => setCopied((c) => (c === s.id ? null : c)), 1500);
    } catch {
      setError("Copie impossible : sélectionnez le texte et copiez-le manuellement.");
    }
  }

  if (!enabled) {
    return (
      <section>
        <PageHeader tab="lives" />
        <EmptyState illustration="live" title="Préparez vos lives comme un pro" text="Trame horodatée, organisation de l’équipe, scripts et réponses rapides par objectif. Markodience prépare le live : il ne le diffuse jamais.">
          {error && <p role="alert" className="w-full text-danger">{error}</p>}
          <button type="button" className="btn-primary" onClick={enable}>Activer les lives pour ce profil</button>
        </EmptyState>
      </section>
    );
  }

  const quick = guideScripts.filter((s) => s.is_quick_reply);
  const operational = guideScripts.filter((s) => !s.is_quick_reply);

  return (
    <section>
      <PageHeader tab="lives">
          <SaveIndicator state={save} />
          <div ref={menuRef} className="relative">
            <button type="button" className="btn-secondary gap-2" aria-haspopup="listbox" aria-expanded={menu} onClick={() => setMenu((v) => !v)}>
              {guide ? OBJECTIVE_LABELS[guide.objective] : "Choisir un guide"} <span aria-hidden className="text-ink-secondary">▾</span>
            </button>
            {menu && (
              <div role="listbox" className="glass-float absolute right-0 z-20 mt-2 w-64 rounded-[18px] p-2 shadow-card-hover">
                {guides.map((g) => (
                  <button key={g.id} type="button" role="option" aria-selected={g.id === activeId} onClick={() => { setActiveId(g.id); setMenu(false); }}
                    className={`block w-full rounded-btn px-3 py-2 text-left text-[15px] hover:bg-black/5 ${g.id === activeId ? "font-semibold" : ""}`}>{OBJECTIVE_LABELS[g.objective]}</button>
                ))}
                {freeObjectives.length > 0 && (<>
                  <div className="my-1 border-t border-black/5" />
                  <button type="button" className="block w-full rounded-btn px-3 py-2 text-left text-[15px] text-accent hover:bg-black/5" onClick={() => { setPicking(true); setMenu(false); }}>+ Nouveau guide</button>
                </>)}
              </div>
            )}
          </div>
        </PageHeader>

      {guides.length > 0 && (
        <div role="tablist" aria-label="Guides de live" className="mt-2 flex gap-2 overflow-x-auto pb-1">
          {guides.map((g) => (
            <button key={g.id} role="tab" type="button" aria-selected={g.id === activeId} onClick={() => setActiveId(g.id)}
              className={`whitespace-nowrap rounded-pill px-5 py-2 text-[15px] font-medium transition ${g.id === activeId ? "bg-night text-white shadow-card" : "bg-white text-ink-secondary shadow-card hover:text-ink"}`}>{OBJECTIVE_LABELS[g.objective]}</button>
          ))}
        </div>
      )}

      {(picking || guides.length === 0) && (
        <div className="card mt-6">
          <h2 className="text-[20px]">Nouveau guide : quel objectif ?</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {freeObjectives.map((o) => (<button key={o} type="button" className="btn-secondary" onClick={() => createGuide(o)}>{OBJECTIVE_LABELS[o]}</button>))}
          </div>
          {guides.length > 0 && <button type="button" className="caption mt-3 underline" onClick={() => setPicking(false)}>Annuler</button>}
        </div>
      )}

      {error && <GenerateError message={error} onRetry={() => setError(null)} />}

      {guide && (
        <>
          <div className="mt-8">
            <h2 className="section-title">Structure du live</h2>
            {steps.length === 0 ? (
              <div className="card mt-4">
                <p className="text-ink-secondary">Aucune trame pour ce guide. Elle sera propre à l&apos;objectif « {OBJECTIVE_LABELS[guide.objective]} ».</p>
                <button type="button" className="btn-primary mt-4" disabled={busy !== null} onClick={() => generate("live_structure")}>{busy === "live_structure" ? "Génération en cours…" : "Générer la trame du live"}</button>
              </div>
            ) : (
              <>
                <ol className="relative mt-5 space-y-4 md:ml-3 md:border-l-2 md:border-dashed md:border-accent/25 md:pl-6">
                  {steps.map((s, i) => (
                    <li key={i} className={`card relative flex gap-5 ${busy === `step${i}` ? "opacity-50" : ""}`}>
                      <span aria-hidden className="num absolute -left-3 top-6 hidden h-6 w-6 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white shadow-glow md:flex">{i + 1}</span>
                      <div className="w-24 shrink-0 pt-1"><EditableText label={`Horaire étape ${i + 1}`} className="text-[15px] font-semibold text-accent" value={s.time_range} onSave={(v) => saveSteps(steps.map((x, j) => (j === i ? { ...x, time_range: v } : x)))} /></div>
                      <div className="min-w-0 flex-1">
                        <EditableText label={`Titre étape ${i + 1}`} className="text-[18px] font-semibold" value={s.title} onSave={(v) => saveSteps(steps.map((x, j) => (j === i ? { ...x, title: v } : x)))} />
                        <EditableText multiline label={`Description étape ${i + 1}`} className="text-[15px]" value={s.description} onSave={(v) => saveSteps(steps.map((x, j) => (j === i ? { ...x, description: v } : x)))} />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button type="button" className="btn-secondary !px-3 !py-1.5" aria-label={`Monter l'étape ${i + 1}`} disabled={i === 0} onClick={() => saveSteps(moveItem(steps, i, i - 1))}>↑</button>
                          <button type="button" className="btn-secondary !px-3 !py-1.5" aria-label={`Descendre l'étape ${i + 1}`} disabled={i === steps.length - 1} onClick={() => saveSteps(moveItem(steps, i, i + 1))}>↓</button>
                          <button type="button" className="btn-secondary !px-3 !py-1.5" disabled={busy !== null} onClick={() => window.confirm("Régénérer cette étape ? Les autres ne changent pas.") && generate("live_step", { step_index: i }, `step${i}`)}>{busy === `step${i}` ? "Régénération…" : "Régénérer cette étape"}</button>
                          <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={() => window.confirm("Supprimer cette étape ?") && saveSteps(steps.filter((_, j) => j !== i))}>Supprimer</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ol>
                <button type="button" className="btn-secondary mt-3" onClick={() => saveSteps([...steps, { time_range: "", title: "Nouvelle étape", description: "" }])}>+ Ajouter une étape</button>
              </>
            )}
          </div>

          <div className="mt-12">
            <h2 className="section-title">Scripts opérationnels</h2>
            {operational.length === 0 && quick.length === 0 ? (
              <div className="card mt-4">
                <p className="text-ink-secondary">Aucun script. Générez des scripts adaptés à cet objectif, ou ajoutez les vôtres.</p>
                <button type="button" className="btn-primary mt-4" disabled={busy !== null} onClick={() => generate("live_scripts")}>{busy === "live_scripts" ? "Génération en cours…" : "Générer les scripts"}</button>
              </div>
            ) : (
              <>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {operational.map((s) => (
                    <article key={s.id} className="card">
                      <EditableText label="Situation" className="font-semibold" value={s.situation ?? ""} onSave={(v) => patchScript(s.id, { situation: v })} />
                      <EditableText multiline label="Contenu du script" className="text-[15px]" value={s.content ?? ""} onSave={(v) => patchScript(s.id, { content: v })} />
                      <div className="mt-2 flex gap-2">
                        <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={() => copy(s)}>{copied === s.id ? <span className="inline-flex items-center gap-1"><Check size={15} strokeWidth={3} aria-hidden />Copié</span> : "Copier"}</button>
                        <button type="button" className="btn-secondary !px-3 !py-1.5" onClick={() => removeScript(s.id)}>Supprimer</button>
                      </div>
                    </article>
                  ))}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className="btn-secondary" onClick={() => addScript(false)}>+ Ajouter un script</button>
                  <button type="button" className="btn-secondary" disabled={busy !== null} onClick={() => window.confirm("Régénérer remplacera les scripts actuels (vos réponses rapides sont conservées). Continuer ?") && generate("live_scripts")}>{busy === "live_scripts" ? "Génération…" : "Regénérer les scripts"}</button>
                </div>
              </>
            )}

            <h3 className="section-title mt-12">Banque de réponses rapides</h3>
            <p className="caption">Réponses courtes à copier en un clic pendant un live (prix, disponibilité, stock, infos pratiques).</p>
            {quick.length === 0 ? (
              <p className="mt-3 text-ink-secondary">Aucune réponse rapide pour l&apos;instant.</p>
            ) : (
              <ul className="mt-3 space-y-3">
                {quick.map((s) => (
                  <li key={s.id} className="card flex flex-wrap items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <EditableText label="Situation de la réponse rapide" className="font-semibold" value={s.situation ?? ""} onSave={(v) => patchScript(s.id, { situation: v })} />
                      <EditableText multiline label="Texte de la réponse rapide" className="text-[15px]" value={s.content ?? ""} onSave={(v) => patchScript(s.id, { content: v })} />
                    </div>
                    <button type="button" className="btn-primary !px-5 !py-2 !text-[15px]" onClick={() => copy(s)}>{copied === s.id ? <span className="inline-flex items-center gap-1"><Check size={15} strokeWidth={3} aria-hidden />Copié</span> : "Copier"}</button>
                    <button type="button" className="btn-secondary" aria-label="Supprimer la réponse rapide" onClick={() => removeScript(s.id)}><X size={16} aria-hidden /></button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="btn-secondary mt-3" onClick={() => addScript(true)}>+ Ajouter une réponse rapide</button>
          </div>
        </>
      )}

      <TeamSection members={members} onAdd={addMember} onRemove={removeMember} />
    </section>
  );
}

function TeamSection({ members, onAdd, onRemove }: { members: Member[]; onAdd: (n: string, r: string, c: string, w: string) => void; onRemove: (id: string) => void }) {
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [channel, setChannel] = useState("");
  const [week, setWeek] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="mt-12">
      <h2 className="section-title">Organisation de l&apos;équipe</h2>
      <p className="caption">Une seule équipe par profil de marque, partagée entre tous les guides. Saisie manuelle.</p>
      {members.length === 0 ? (
        <p className="mt-3 text-ink-secondary">Aucun membre pour l&apos;instant. Ajoutez le présentateur, le modérateur, la régie…</p>
      ) : (
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {members.map((m) => (
            <article key={m.id} className="card">
              <p className="text-[18px] font-semibold">{m.name}</p>
              <p className="text-[15px] text-ink-secondary">{m.role || "Rôle non précisé"}</p>
              <p className="caption mt-2">{m.channel ? `Canal : ${m.channel}` : "Canal non précisé"}{m.rotation_week ? ` · Rotation : semaine ${m.rotation_week}` : ""}</p>
              <button type="button" className="btn-secondary mt-3 !px-3 !py-1.5" onClick={() => onRemove(m.id)} aria-label={`Retirer ${m.name}`}>Retirer</button>
            </article>
          ))}
        </div>
      )}
      <div className="card mt-4 grid gap-3 sm:grid-cols-4">
        <input aria-label="Nom du membre" className="input" placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} />
        <input aria-label="Rôle" className="input" placeholder="Rôle (présentateur…)" value={role} onChange={(e) => setRole(e.target.value)} />
        <input aria-label="Canal en charge" className="input" placeholder="Canal" value={channel} onChange={(e) => setChannel(e.target.value)} />
        <input aria-label="Semaine de rotation" type="number" min={1} className="input" placeholder="Semaine (option)" value={week} onChange={(e) => setWeek(e.target.value)} />
        <div className="sm:col-span-4">
          {err && <p role="alert" className="mb-2 text-[15px] text-danger">{err}</p>}
          <button type="button" className="btn-primary" onClick={() => { if (!name.trim()) return setErr("Indiquez le nom du membre."); setErr(null); onAdd(name.trim(), role.trim(), channel.trim(), week); setName(""); setRole(""); setChannel(""); setWeek(""); }}>Ajouter le membre</button>
        </div>
      </div>
    </div>
  );
}
