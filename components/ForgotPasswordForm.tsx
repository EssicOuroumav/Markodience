"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, MailCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError("Saisissez une adresse e-mail valide.");
    setLoading(true);
    const { error: err } = await createClient().auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    setLoading(false);
    // Même réponse que le compte existe ou non : on ne révèle pas quelles adresses sont inscrites.
    if (err && err.status === 429) return setError("Trop de demandes. Patientez quelques minutes avant de réessayer.");
    setSent(true);
  }

  if (sent) {
    return (
      <div className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-accent-soft text-accent"><MailCheck size={30} strokeWidth={1.6} /></span>
        <h1 className="mt-6 text-[28px]">Vérifiez votre boîte mail</h1>
        <p className="mt-3 text-ink-secondary">Si un compte existe avec cette adresse, vous allez recevoir un lien pour choisir un nouveau mot de passe. Il est valable une heure. Pensez à regarder dans vos courriers indésirables.</p>
        <Link href="/login" className="btn-secondary mt-8">Retour à la connexion</Link>
      </div>
    );
  }

  return (
    <div>
      <Link href="/login" className="btn-ghost -ml-4"><ArrowLeft size={17} />Connexion</Link>
      <h1 className="mt-4 text-[28px]">Mot de passe oublié ?</h1>
      <p className="mt-2 text-ink-secondary">Indiquez l&apos;adresse e-mail de votre compte : nous vous envoyons un lien pour en choisir un nouveau.</p>
      <div className="mt-8">
        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-[15px]">{error}</p>}
      <button type="button" className="btn-primary mt-6 w-full" onClick={submit} disabled={loading}>{loading ? "Envoi…" : "Envoyer le lien"}</button>
    </div>
  );
}
