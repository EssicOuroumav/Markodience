"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandForm from "@/components/BrandForm";
import { LEGAL } from "@/lib/legal";
import { validatePassword } from "@/lib/password";

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
  const [accepted, setAccepted] = useState(false);

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
    const invalidPassword = validatePassword(password);
    if (invalidPassword) {
      setError(invalidPassword);
      return;
    }
    if (!accepted) {
      setError("Pour créer votre compte, acceptez les conditions d'utilisation et la politique de confidentialité.");
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), phone: phone.trim(), terms_accepted_at: new Date().toISOString(), terms_version: LEGAL.termsVersion },
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
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder="8 caractères, une lettre et un chiffre" />
            </div>
            <div>
              <label className="label" htmlFor="phone">Téléphone</label>
              <input id="phone" type="tel" className="input" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="+225 ..." />
            </div>
          </div>
          <label className="mt-6 flex cursor-pointer items-start gap-3 text-[14px] leading-snug text-ink-secondary">
            <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded-md border-black/20 accent-[var(--color-accent)]" />
            <span>J&apos;accepte les <a href="/cgu" target="_blank" rel="noopener" className="text-accent underline">conditions d&apos;utilisation</a> et la <a href="/confidentialite" target="_blank" rel="noopener" className="text-accent underline">politique de confidentialité</a>.</span>
          </label>
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
          <p className="mt-1 text-ink-secondary">Ajoutez le nom, le logo et la couleur de votre première marque.</p>
          <div className="mt-8">
            {userId && <BrandForm userId={userId} submitLabel="Créer mon espace" onCreated={() => { router.push("/dashboard"); router.refresh(); }} />}
          </div>
        </>
      )}
    </div>
  );
}
