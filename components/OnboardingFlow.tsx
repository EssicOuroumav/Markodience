"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import BrandForm from "@/components/BrandForm";

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
          <p className="mt-1 text-ink-secondary">Ajoutez le nom, le logo et la couleur de votre première marque.</p>
          <div className="mt-8">
            {userId && <BrandForm userId={userId} submitLabel="Créer mon espace" onCreated={() => { router.push("/dashboard"); router.refresh(); }} />}
          </div>
        </>
      )}
    </div>
  );
}
