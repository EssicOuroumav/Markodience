"use client";

import { useEffect, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SECTORS } from "@/lib/sectors";
import { setActiveBrandCookie } from "@/components/BrandSwitcher";
import type { BrandStatus } from "@/types";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const SWATCHES = ["#0071E3", "#059669", "#C2410C", "#7C3AED", "#BE123C", "#1D1D1F"];

/** Création d'un profil de marque : utilisé à l'inscription et pour ajouter une marque depuis le tableau de bord. */
export default function BrandForm({ userId, submitLabel, onCreated, onLimit }: { userId: string; submitLabel: string; onCreated: (brandId: string) => void; onLimit?: () => void }) {
  const supabase = createClient();
  const [status, setStatus] = useState<BrandStatus>("freelance");
  const [name, setName] = useState("");
  const [sector, setSector] = useState("");
  const [color, setColor] = useState("#0071E3");
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pickLogo(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) return setError("Le logo doit être une image PNG, JPG ou WebP.");
    if (file.size > MAX_LOGO_BYTES) return setError("Le logo ne doit pas dépasser 2 Mo.");
    setLogo(file);
    setPreview(URL.createObjectURL(file));
  }

  async function submit() {
    setError(null);
    if (!name.trim()) return setError("Donnez un nom à votre marque.");
    setLoading(true);

    let logoUrl: string | null = null;
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

    const { data: created, error: insErr } = await supabase
      .from("brand_profiles")
      .insert({ user_id: userId, name: name.trim(), sector: sector || null, logo_url: logoUrl, primary_color: color, status })
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
            <div className="min-w-0 flex-1"><p className="truncate text-[15px] font-medium">{logo?.name}</p><p className="caption">Le site s&apos;adapte à la forme de votre logo.</p></div>
            <button type="button" className="btn-secondary !px-3" aria-label="Retirer le logo" onClick={() => { setLogo(null); setPreview(null); }}><X size={16} /></button>
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
            <button key={c} type="button" aria-label={`Couleur ${c}`} aria-pressed={color.toUpperCase() === c} onClick={() => setColor(c)}
              className={`h-9 w-9 rounded-full border-2 transition ${color.toUpperCase() === c ? "scale-110 border-ink shadow-card" : "border-white shadow-[0_0_0_1px_rgba(0,0,0,0.1)] hover:scale-105"}`} style={{ background: c }} />
          ))}
          <input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} aria-label="Choisir une autre couleur" className="h-9 w-12 cursor-pointer rounded-xl border border-black/10 bg-white p-1" />
          <span className="caption num">{color.toUpperCase()}</span>
        </div>
      </div>

      {error && <p role="alert" className="rounded-2xl bg-danger/10 px-4 py-3 text-[15px]">{error}</p>}
      <button type="button" className="btn-primary w-full" onClick={submit} disabled={loading}>{loading ? "Création…" : submitLabel}</button>
    </div>
  );
}
