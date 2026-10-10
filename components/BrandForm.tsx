"use client";

import { useEffect, useState } from "react";
import { ImagePlus, Plus, Sparkles, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SECTORS } from "@/lib/sectors";
import { MAX_ABOUT, MAX_LINKS, SOCIAL_NETWORKS, parseBrandInfoInput, readBrandInfo } from "@/lib/brandInfo";
import { colorFromImageFile } from "@/lib/logoColor";
import { setActiveBrandCookie } from "@/components/BrandSwitcher";
import type { BrandProfile, BrandStatus } from "@/types";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const SWATCHES = ["#0071E3", "#059669", "#C2410C", "#7C3AED", "#BE123C", "#1D1D1F"];

/** Création d'un profil de marque : utilisé à l'inscription et pour ajouter une marque depuis le tableau de bord. */
export default function BrandForm({ userId, submitLabel, onCreated, onLimit, brand }: { userId: string; submitLabel: string; onCreated: (brandId: string) => void; onLimit?: () => void; brand?: BrandProfile }) {
  const supabase = createClient();
  const [status, setStatus] = useState<BrandStatus>(brand?.status ?? "freelance");
  const [name, setName] = useState(brand?.name ?? "");
  const [sector, setSector] = useState(brand?.sector ?? "");
  const [color, setColor] = useState(brand?.primary_color ?? "#0071E3");
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(brand?.logo_url ?? null);
  const [keepExisting, setKeepExisting] = useState(!!brand?.logo_url);
  const [detected, setDetected] = useState<string | null>(null);
  const [colorTouched, setColorTouched] = useState(!!brand);
  const initialInfo = brand ? readBrandInfo(brand) : null;
  const [website, setWebsite] = useState(initialInfo?.website ?? "");
  const [socials, setSocials] = useState<Record<string, string>>(initialInfo?.socials ?? {});
  const [links, setLinks] = useState<{ label: string; url: string }[]>(initialInfo?.links ?? []);
  const [about, setAbout] = useState(initialInfo?.about ?? "");
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview); }, [preview]);

  function pickLogo(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return setError("Le logo doit être une image PNG, JPG ou WebP.");
    if (file.size > MAX_LOGO_BYTES) return setError("Le logo ne doit pas dépasser 2 Mo.");
    setLogo(file);
    setKeepExisting(false);
    setPreview(URL.createObjectURL(file));
    // La couleur de l'interface suit celle du logo, sauf si l'utilisateur en a déjà choisi une.
    void colorFromImageFile(file).then((c) => {
      setDetected(c);
      if (c && !colorTouched) setColor(c);
    });
  }

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Donnez un nom à votre marque.");
    const info = parseBrandInfoInput({ website, socials, links, about });
    if (!info.ok) return setError(info.error);
    setLoading(true);

    let logoUrl: string | null = brand && keepExisting ? brand.logo_url : null;
    if (logo) {
      const ext = logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("logos").upload(path, logo, { contentType: logo.type });
      if (upErr) {
        setLoading(false);
        return setError("Le logo n'a pas pu être envoyé : " + upErr.message);
      }
      logoUrl = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
    }

    const fields = { name: name.trim(), sector: sector || null, logo_url: logoUrl, primary_color: color, status, ...info.info };

    if (brand) {
      const { error: updErr } = await supabase.from("brand_profiles").update(fields).eq("id", brand.id);
      setLoading(false);
      if (updErr) return setError("La marque n'a pas pu être modifiée : " + updErr.message);
      // Ancien logo remplacé ou retiré : on supprime le fichier devenu inutile (meilleur effort).
      if (brand.logo_url && brand.logo_url !== logoUrl) {
        const marker = "/logos/";
        const old = brand.logo_url.split(marker)[1];
        if (old && old.startsWith(`${userId}/`)) await supabase.storage.from("logos").remove([old]).catch(() => undefined);
      }
      onCreated(brand.id);
      return;
    }

    const { data: created, error: insErr } = await supabase
      .from("brand_profiles")
      .insert({ user_id: userId, ...fields })
      .select("id")
      .single();
    setLoading(false);
    if (insErr || !created) {
      if (insErr?.code === "42501") {
        setError("Vous avez atteint la limite de profils de votre palier. Passez au palier supérieur pour en créer d'autres.");
        onLimit?.();
      } else {
        setError("Le profil n'a pas pu être créé : " + (insErr?.message ?? "erreur inconnue"));
      }
      return;
    }
    setActiveBrandCookie(created.id);
    onCreated(created.id);
  }

  return (
    <div className="space-y-6">
      <div role="group" aria-label="Statut" className="grid grid-cols-2 gap-1 rounded-2xl bg-canvas p-1">
        {(["freelance", "organisation"] as const).map((s) => (
          <button key={s} type="button" aria-pressed={status === s} onClick={() => setStatus(s)}
            className={`rounded-xl py-2.5 text-[15px] font-medium transition ${status === s ? "bg-white shadow-card" : "text-ink-secondary hover:text-ink"}`}>
            {s === "freelance" ? "Freelance" : "Organisation"}
          </button>
        ))}
      </div>

      <div><label className="label" htmlFor="brandName">Nom de la marque</label><input id="brandName" className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Maison Awa" /></div>

      <div>
        <label className="label" htmlFor="sector">Secteur d&apos;activité</label>
        <select id="sector" className="input" value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">Choisir un secteur</option>
          {SECTORS.map((s) => (<option key={s} value={s}>{s}</option>))}
        </select>
      </div>

      <div>
        <span className="label">Logo <span className="font-normal text-ink-secondary">(facultatif)</span></span>
        {preview ? (
          <div className="flex items-center gap-4 rounded-2xl border border-black/10 bg-white p-3 shadow-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="Aperçu du logo" className="h-16 max-w-[140px] rounded-xl border border-black/5 bg-white object-contain p-1" />
            <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{logo?.name ?? "Logo actuel"}</p><p className="caption">Le site s&apos;adapte à la forme de votre logo.</p></div>
            <button type="button" className="btn-secondary !px-3" aria-label="Retirer le logo" onClick={() => { setLogo(null); setPreview(null); setKeepExisting(false); }}><X size={16} /></button>
          </div>
        ) : (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); pickLogo(e.dataTransfer.files[0]); }}
            className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-4 py-7 text-center transition ${dragging ? "border-accent bg-accent-soft/60" : "border-black/12 bg-white hover:border-accent/50 hover:bg-accent-soft/30"}`}
          >
            <input type="file" accept={LOGO_TYPES.join(",")} className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
            <span aria-hidden className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-soft text-accent transition group-hover:scale-105"><ImagePlus size={22} strokeWidth={1.7} /></span>
            <span className="mt-3 text-[15px] font-medium">Déposez votre logo ici ou cliquez pour choisir</span>
            <span className="caption mt-1">PNG, JPG ou WebP · 2 Mo max</span>
          </label>
        )}
      </div>

      <div>
        <label className="label" htmlFor="color">Couleur principale</label>
        <div className="flex flex-wrap items-center gap-2.5">
          {SWATCHES.map((c) => (
            <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={color.toUpperCase() === c} onClick={() => { setColor(c); setColorTouched(true); }}
              className={`h-9 w-9 rounded-full border-2 transition ${color.toUpperCase() === c ? "scale-110 border-ink shadow-card" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-105"}`} style={{ background: c }} />
          ))}
          <input id="color" type="color" value={color} onChange={(e) => { setColor(e.target.value); setColorTouched(true); }} aria-label="Choisir une autre couleur" className="h-9 w-12 cursor-pointer rounded-xl border border-black/10 bg-white p-1" />
          <span className="caption num">{color.toUpperCase()}</span>
        </div>
        {detected && (
          <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-secondary"><Sparkles size={14} className="text-accent" />Couleur détectée sur votre logo : <span className="inline-block h-3.5 w-3.5 rounded-full border border-black/10 align-middle" style={{ background: detected }} /> <span className="num">{detected}</span>
            {color.toUpperCase() !== detected && <button type="button" className="font-medium text-accent" onClick={() => { setColor(detected); setColorTouched(true); }}>La reprendre</button>}</p>
        )}
        <p className="caption mt-1.5">Le tableau de bord prend cette couleur. Vous pourrez la changer plus tard.</p>
      </div>

      <details className="rounded-2xl border border-black/10 bg-white p-4" open={!!initialInfo && (!!initialInfo.website || Object.keys(initialInfo.socials).length > 0 || initialInfo.links.length > 0 || !!initialInfo.about)}>
        <summary className="cursor-pointer text-[15px] font-semibold">Pour aller plus vite <span className="font-normal text-ink-secondary">(facultatif)</span></summary>
        <p className="caption mt-1">Ces liens servent à remplir la fiche de votre marque et à mieux guider l&apos;IA. Rien n&apos;est publié.</p>
        <div className="mt-4 space-y-4">
          <div><label className="label" htmlFor="website">Site web</label><input id="website" className="input" placeholder="monsite.ci" value={website} onChange={(e) => setWebsite(e.target.value)} /></div>
          <div>
            <span className="label">Réseaux sociaux</span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SOCIAL_NETWORKS.map((n) => (
                <div key={n} className="flex items-center gap-2"><span className="w-[84px] shrink-0 text-[14px] font-medium">{n}</span>
                  <input aria-label={`Adresse ${n}`} className="input" placeholder={n === "WhatsApp" ? "Numéro ou lien" : "Lien de la page ou @nom"} value={socials[n] ?? ""} onChange={(e) => setSocials((s) => ({ ...s, [n]: e.target.value }))} /></div>
              ))}
            </div>
          </div>
          <div>
            <span className="label">Documents et autres liens <span className="font-normal text-ink-secondary">(dossier partagé, brochure, présentation…)</span></span>
            <div className="space-y-2">
              {links.map((l, i) => (
                <div key={i} className="flex gap-2">
                  <input aria-label={`Nom du lien ${i + 1}`} className="input max-w-[170px]" placeholder="Nom" value={l.label} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} />
                  <input aria-label={`Adresse du lien ${i + 1}`} className="input" placeholder="Adresse du document" value={l.url} onChange={(e) => setLinks((ls) => ls.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)))} />
                  <button type="button" className="btn-ghost !px-2" aria-label="Retirer ce lien" onClick={() => setLinks((ls) => ls.filter((_, j) => j !== i))}><X size={16} /></button>
                </div>
              ))}
            </div>
            {links.length < MAX_LINKS && <button type="button" className="btn-ghost mt-1 !px-3 text-accent" onClick={() => setLinks((ls) => [...ls, { label: "", url: "" }])}><Plus size={16} />Ajouter un lien</button>}
          </div>
          <div><label className="label" htmlFor="about">En deux phrases, qui êtes-vous ?</label><textarea id="about" rows={3} maxLength={MAX_ABOUT} className="input" placeholder="Ex. : une association qui soutient les enfants vulnérables d'Abidjan en éducation et en santé." value={about} onChange={(e) => setAbout(e.target.value)} /></div>
        </div>
      </details>

      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[15px]">{error}</p>}
      <button type="button" className="btn-primary w-full" onClick={submit} disabled={loading}>{loading ? "Création…" : submitLabel}</button>
    </div>
  );
}
