"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { SECTORS } from "@/lib/sectors";
import { setActiveBrandCookie } from "@/components/BrandSwitcher";
import type { BrandStatus } from "@/types";

const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function OnboardingFlow() {
  const router = useRouter();
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2>(1);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Étape 1
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");

  // Étape 2
  const [status, setStatus] = useState<BrandStatus>("freelance");
  const [brandName, setBrandName] = useState("");
  const [sector, setSector] = useState("");
  const [color, setColor] = useState("#0071E3");
  const [logo, setLogo] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);

  // Utilisateur déjà connecté sans profil de marque : on reprend à l'étape 2.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        setStep(2);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleStep1() {
    setError(null);
    setNotice(null);
    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setError("Renseignez votre nom, votre email et votre téléphone.");
      return;
    }
    if (password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim() },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (err) {
      setError(
        err.message.toLowerCase().includes("already")
          ? "Un compte existe déjà avec cet email. Connectez-vous."
          : "Inscription impossible : " + err.message,
      );
      return;
    }
    if (!data.session || !data.user) {
      setNotice(
        "Compte créé. Cliquez sur le lien de confirmation reçu par email : vous reviendrez ici pour créer votre profil de marque.",
      );
      return;
    }
    setUserId(data.user.id);
    setStep(2);
  }

  function pickLogo(file: File | undefined) {
    setError(null);
    if (!file) return;
    if (!LOGO_TYPES.includes(file.type)) {
      setError("Le logo doit être une image PNG, JPG ou WebP.");
      return;
    }
    if (file.size > MAX_LOGO_BYTES) {
      setError("Le logo ne doit pas dépasser 2 Mo.");
      return;
    }
    setLogo(file);
  }

  async function handleStep2() {
    setError(null);
    if (!userId) return;
    if (!brandName.trim()) {
      setError("Donnez un nom à votre marque.");
      return;
    }
    setLoading(true);

    let logoUrl: string | null = null;
    if (logo) {
      const ext = logo.type === "image/png" ? "png" : logo.type === "image/webp" ? "webp" : "jpg";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("logos")
        .upload(path, logo, { contentType: logo.type });
      if (upErr) {
        setLoading(false);
        setError("Le logo n'a pas pu être envoyé : " + upErr.message);
        return;
      }
      logoUrl = supabase.storage.from("logos").getPublicUrl(path).data.publicUrl;
    }

    const { data: created, error: insErr } = await supabase.from("brand_profiles").insert({
      user_id: userId,
      name: brandName.trim(),
      sector: sector || null,
      logo_url: logoUrl,
      primary_color: color,
      status,
    }).select("id").single();
    setLoading(false);
    if (insErr) {
      setError(
        insErr.code === "42501"
          ? "Vous avez atteint la limite de profils de votre palier. Passez au palier supérieur pour en créer d'autres."
          : "Le profil n'a pas pu être créé : " + insErr.message,
      );
      return;
    }
    if (created) setActiveBrandCookie(created.id);
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full">
      <p className="caption mb-2">Étape {step} sur 2</p>

      {step === 1 ? (
        <>
          <h1 className="text-[28px]">Créez votre compte</h1>
          <div className="mt-8 space-y-5">
            <div>
              <label className="label" htmlFor="fullName">Nom</label>
              <input id="fullName" className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} autoComplete="name" />
            </div>
            <div>
              <label className="label" htmlFor="email">Email</label>
              <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div>
              <label className="label" htmlFor="password">Mot de passe</label>
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="8 caractères minimum" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Téléphone</label>
              <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+225 ..." />
            </div>
          </div>
          {error && <p role="alert" className="mt-4 text-[15px] text-danger">{error}</p>}
          {notice && <p role="status" className="mt-4 text-[15px] text-ink-secondary">{notice}</p>}
          <button type="button" className="btn-primary mt-6 w-full" onClick={handleStep1} disabled={loading}>
            {loading ? "Création…" : "Continuer"}
          </button>
          <p className="caption mt-4 text-center">
            Déjà un compte ? <a className="text-accent" href="/login">Se connecter</a>
          </p>
        </>
      ) : (
        <>
          <h1 className="text-[28px]">Votre profil de marque</h1>
          <div className="mt-8 space-y-5">
            <div role="group" aria-label="Statut" className="grid grid-cols-2 gap-1 rounded-btn bg-bg-secondary p-1">
              {(["freelance", "organisation"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={status === s}
                  onClick={() => setStatus(s)}
                  className={`rounded-[10px] py-2 text-[15px] font-medium transition ${status === s ? "bg-bg shadow-sm" : "text-ink-secondary"}`}
                >
                  {s === "freelance" ? "Freelance" : "Organisation"}
                </button>
              ))}
            </div>
            <div>
              <label className="label" htmlFor="brandName">Nom de la marque</label>
              <input id="brandName" className="input" value={brandName} onChange={(e) => setBrandName(e.target.value)} />
            </div>
            <div>
              <label className="label" htmlFor="sector">Secteur d&apos;activité</label>
              <select id="sector" className="input" value={sector} onChange={(e) => setSector(e.target.value)}>
                <option value="">Choisir un secteur</option>
                {SECTORS.map((s) => (<option key={s} value={s}>{s}</option>))}
              </select>
            </div>
            <div>
              <span className="label">Logo</span>
              <label
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); pickLogo(e.dataTransfer.files[0]); }}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-card border border-dashed px-4 py-8 text-center transition ${dragging ? "border-accent bg-bg-secondary" : "border-line"}`}
              >
                <input type="file" accept={LOGO_TYPES.join(",")} className="sr-only" onChange={(e) => pickLogo(e.target.files?.[0])} />
                <span className="text-[15px]">{logo ? logo.name : "Déposez votre logo ici ou cliquez pour choisir"}</span>
                <span className="caption mt-1">PNG, JPG ou WebP, 2 Mo max (facultatif)</span>
              </label>
            </div>
            <div>
              <label className="label" htmlFor="color">Couleur principale</label>
              <div className="flex items-center gap-3">
                <input id="color" type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-11 w-14 cursor-pointer rounded-btn border border-line bg-bg p-1" />
                <span className="caption">{color.toUpperCase()}</span>
              </div>
            </div>
          </div>
          {error && <p role="alert" className="mt-4 text-[15px] text-danger">{error}</p>}
          <button type="button" className="btn-primary mt-6 w-full" onClick={handleStep2} disabled={loading}>
            {loading ? "Création…" : "Créer mon espace"}
          </button>
        </>
      )}
    </div>
  );
}
