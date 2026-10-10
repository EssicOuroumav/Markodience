"use client";

import { Download, ExternalLink, FileText, FolderOpen, Link2, Palette, Plus, Trash2, UploadCloud } from "lucide-react";
import Link from "next/link";
import { cleanUrl } from "@/lib/brandInfo";
import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { ASSET_CATEGORIES, ASSET_CATEGORY_LABEL, LIBRARY_MAX_FILES, assetPath, displayName, guessCategory, isImage, totalBytes, validateAssetFile, type Asset, type AssetCategory, type LibraryMime } from "@/lib/library";
import { formatMegabytes } from "@/lib/audit";
import EditableText from "./EditableText";
import EmptyState from "./EmptyState";
import PageHeader from "./PageHeader";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

export type MediaLink = { id: string; label: string; url: string; kind: "dossier" | "canva" | "figma" | "charte" | "document" | "autre" };
const LINK_KINDS: Record<MediaLink["kind"], string> = { dossier: "Dossier de médias", canva: "Modèle Canva", figma: "Fichier Figma", charte: "Charte graphique", document: "Document", autre: "Autre" };
const COLUMNS = "id, brand_profile_id, name, category, path, mime, size_bytes, created_at";

export default function LibraryTab({ brandId, initial, initialUrls, initialLinks = [], ficheLinks = [] }: { brandId: string; initial: Asset[]; initialUrls: Record<string, string>; initialLinks?: MediaLink[]; ficheLinks?: { label: string; url: string }[] }) {
  const supabase = createClient();
  const [assets, setAssets] = useState<Asset[]>(initial);
  const [filter, setFilter] = useState<AssetCategory | "all">("all");
  const [urls, setUrls] = useState<Record<string, string>>(initialUrls);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [save, setSave] = useState<SaveState>("idle");
  const input = useRef<HTMLInputElement>(null);
  const [links, setLinks] = useState<MediaLink[]>(initialLinks);
  const [linkForm, setLinkForm] = useState({ label: "", url: "", kind: "dossier" as MediaLink["kind"] });
  const [linkError, setLinkError] = useState<string | null>(null);

  async function addLink() {
    setLinkError(null);
    const url = cleanUrl(linkForm.url);
    if (url === null || url === "invalid") return setLinkError("Collez une adresse valide (exemple : canva.com/design/…).");
    if (!linkForm.label.trim()) return setLinkError("Donnez un nom à ce lien.");
    setSave("saving");
    const { data, error } = await supabase.from("media_links").insert({ brand_profile_id: brandId, label: linkForm.label.trim().slice(0, 120), url, kind: linkForm.kind, position: links.length }).select("id, label, url, kind").single();
    if (error || !data) { setSave("error"); return setLinkError(error?.code === "42501" ? "Limite de 60 liens atteinte ou palier insuffisant." : "Le lien n'a pas pu être enregistré."); }
    setLinks((l) => [...l, data as MediaLink]);
    setLinkForm({ label: "", url: "", kind: linkForm.kind });
    setSave("saved");
  }

  async function removeLink(id: string) {
    setSave("saving");
    const { error } = await supabase.from("media_links").delete().eq("id", id);
    if (error) return setSave("error");
    setLinks((l) => l.filter((x) => x.id !== id));
    setSave("saved");
  }

  // Liens temporaires (1 h) pour les aperçus : le dossier est privé.
  async function sign(list: Asset[]) {
    const need = list.filter((a) => isImage(a.mime));
    if (!need.length) return;
    const { data } = await supabase.storage.from("library").createSignedUrls(need.map((a) => a.path), 3600);
    setUrls((u) => ({ ...u, ...Object.fromEntries((data ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as const] : []))) }));
  }

  async function upload(files: File[]) {
    setProblems([]);
    const errors: string[] = [];
    const added: Asset[] = [];
    let count = assets.length;
    setUploading(true);
    setSave("saving");
    for (const f of files) {
      const bad = validateAssetFile(f);
      if (bad) { errors.push(`${f.name} : ${bad}`); continue; }
      if (count >= LIBRARY_MAX_FILES) { errors.push(`${f.name} : la bibliothèque est pleine (${LIBRARY_MAX_FILES} fichiers par marque).`); continue; }
      const id = crypto.randomUUID();
      const path = assetPath(brandId, id, f.type as LibraryMime);
      const { error: upErr } = await supabase.storage.from("library").upload(path, f, { contentType: f.type });
      if (upErr) { errors.push(`${f.name} : l'envoi a échoué.`); continue; }
      const { data, error } = await supabase.from("assets").insert({ id, brand_profile_id: brandId, name: displayName(f.name), category: guessCategory(f.type), path, mime: f.type, size_bytes: f.size }).select(COLUMNS).single();
      if (error || !data) { await supabase.storage.from("library").remove([path]); errors.push(`${f.name} : l'enregistrement a échoué.`); continue; }
      added.push(data as Asset);
      count++;
    }
    setUploading(false);
    setSave(errors.length && !added.length ? "error" : "saved");
    setProblems(errors);
    if (added.length) { setAssets((a) => [...added, ...a]); void sign(added); }
  }

  async function patch(id: string, p: Partial<Pick<Asset, "name" | "category">>) {
    setAssets((as) => as.map((a) => (a.id === id ? { ...a, ...p } : a)));
    setSave("saving");
    const { error } = await supabase.from("assets").update(p).eq("id", id);
    setSave(error ? "error" : "saved");
  }

  async function remove(a: Asset) {
    if (!window.confirm(`Supprimer « ${a.name} » de la bibliothèque ?`)) return;
    setSave("saving");
    await supabase.storage.from("library").remove([a.path]);
    const { error } = await supabase.from("assets").delete().eq("id", a.id);
    if (error) return setSave("error");
    setAssets((as) => as.filter((x) => x.id !== a.id));
    setSave("saved");
  }

  async function download(a: Asset) {
    const { data } = await supabase.storage.from("library").createSignedUrl(a.path, 60, { download: `${a.name}.${a.path.split(".").pop()}` });
    if (data?.signedUrl) window.location.assign(data.signedUrl);
  }

  const shown = assets.filter((a) => filter === "all" || a.category === filter);
  const used = totalBytes(assets);

  return (
    <section className="rise">
      <PageHeader tab="library"><SaveIndicator state={save} /></PageHeader>

      <article className="card-flat mb-6">
        <div className="flex flex-wrap items-center justify-between gap-2"><h2 className="section-title flex items-center gap-2"><Link2 size={19} className="text-accent" />Liens et ressources</h2><Link href="/dashboard/identity#charter" className="btn-secondary !py-1.5 text-[14px]"><Palette size={15} />Charte graphique</Link></div>
        <p className="mt-1 text-[15px] text-ink-secondary">Les dossiers de médias, modèles Canva ou Figma et documents de la marque, à un clic. Les fichiers eux-mêmes se déposent plus bas.</p>
        {(links.length > 0 || ficheLinks.length > 0) && (
          <ul className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {links.map((l) => (
              <li key={l.id} className="flex items-center gap-3 rounded-2xl border border-black/10 bg-white p-3">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent"><FolderOpen size={18} /></span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{l.label}</span><span className="caption inline-flex items-center gap-1">{LINK_KINDS[l.kind]} <ExternalLink size={11} /></span></a>
                <button type="button" className="btn-ghost !px-2 text-ink-secondary hover:text-danger" aria-label={`Retirer le lien ${l.label}`} onClick={() => removeLink(l.id)}><Trash2 size={15} /></button>
              </li>
            ))}
            {ficheLinks.map((l) => (
              <li key={l.url} className="flex items-center gap-3 rounded-2xl border border-dashed border-black/15 bg-canvas p-3">
                <span aria-hidden className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-ink-secondary"><Link2 size={18} /></span>
                <a href={l.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold">{l.label}</span><span className="caption inline-flex items-center gap-1">Fiche de la marque <ExternalLink size={11} /></span></a>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-4 grid gap-2.5 md:grid-cols-[1fr_1.4fr_170px_auto]">
          <input aria-label="Nom du lien" className="input" maxLength={120} placeholder="Nom (ex. : Modèles Canva)" value={linkForm.label} onChange={(e) => setLinkForm({ ...linkForm, label: e.target.value })} />
          <input aria-label="Adresse du lien" className="input" placeholder="Adresse du dossier ou du fichier" value={linkForm.url} onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })} />
          <select aria-label="Type de lien" className="input" value={linkForm.kind} onChange={(e) => setLinkForm({ ...linkForm, kind: e.target.value as MediaLink["kind"] })}>{Object.entries(LINK_KINDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <button type="button" className="btn-primary" onClick={addLink}><Plus size={16} />Ajouter</button>
        </div>
        {linkError && <p role="alert" className="mt-2 text-[14px] text-danger">{linkError}</p>}
      </article>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); void upload([...e.dataTransfer.files]); }}
        className={`card-flat flex flex-col items-center gap-3 border-2 border-dashed py-8 text-center transition ${dragging ? "border-accent bg-accent-soft" : "border-black/10"}`}>
        <UploadCloud size={30} className="text-accent" aria-hidden />
        <p className="text-[16px] font-medium">Glissez vos fichiers ici</p>
        <p className="caption">PNG, JPG, WebP ou PDF · 10 Mo maximum par fichier · {assets.length} / {LIBRARY_MAX_FILES} fichiers · {formatMegabytes(used)} utilisés</p>
        <button type="button" className="btn-primary" disabled={uploading} onClick={() => input.current?.click()}>{uploading ? "Envoi en cours…" : "Choisir des fichiers"}</button>
        <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" className="sr-only" aria-label="Choisir des fichiers à ajouter" onChange={(e) => { void upload([...(e.target.files ?? [])]); e.target.value = ""; }} />
      </div>
      {problems.length > 0 && <ul role="alert" className="mt-4 space-y-1 rounded-2xl bg-danger/10 px-5 py-3.5 text-[15px]">{problems.map((p) => <li key={p}>{p}</li>)}</ul>}

      {assets.length === 0 ? (
        <div className="mt-6"><EmptyState illustration="start" title="Votre bibliothèque est vide" text="Ajoutez le logo, des photos du terrain, vos visuels et vos documents : tout reste au même endroit, privé, pour cette marque." /></div>
      ) : (
        <>
          <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Catégorie">
            {(["all", ...ASSET_CATEGORIES] as const).map((c) => {
              const n = c === "all" ? assets.length : assets.filter((a) => a.category === c).length;
              return (
                <button key={c} type="button" aria-pressed={filter === c} onClick={() => setFilter(c)}
                  className={`rounded-pill px-4 py-1.5 text-[14px] font-medium transition ${filter === c ? "bg-night text-white shadow-card" : "bg-white text-ink-secondary shadow-card hover:text-ink"}`}>{c === "all" ? "Tout" : ASSET_CATEGORY_LABEL[c]} · {n}</button>
              );
            })}
          </div>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {shown.map((a) => (
              <li key={a.id} className="card-flat flex flex-col overflow-hidden !p-0">
                <div className="flex h-40 items-center justify-center bg-canvas">
                  {isImage(a.mime) && urls[a.path] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={urls[a.path]} alt={a.name} className="h-full w-full object-contain" loading="lazy" />
                  ) : (
                    <FileText size={40} className="text-ink-secondary" aria-hidden />
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-1 p-3">
                  <EditableText label={`Nom du fichier ${a.name}`} className="text-[15px] font-semibold" value={a.name} onSave={(v) => v.trim() && patch(a.id, { name: v.trim().slice(0, 80) })} />
                  <p className="caption px-2">{formatMegabytes(Number(a.size_bytes))} · {a.mime === "application/pdf" ? "PDF" : "Image"}</p>
                  <select aria-label={`Catégorie de ${a.name}`} className="input !py-1.5 text-[14px]" value={a.category} onChange={(e) => patch(a.id, { category: e.target.value as AssetCategory })}>
                    {ASSET_CATEGORIES.map((c) => <option key={c} value={c}>{ASSET_CATEGORY_LABEL[c]}</option>)}
                  </select>
                  <div className="mt-2 flex gap-2">
                    <button type="button" className="btn-secondary flex-1 !py-1.5" onClick={() => download(a)}><Download size={15} />Télécharger</button>
                    <button type="button" className="btn-ghost text-danger" aria-label={`Supprimer ${a.name}`} onClick={() => remove(a)}><Trash2 size={16} /></button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
