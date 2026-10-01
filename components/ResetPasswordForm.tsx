"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { validatePassword } from "@/lib/password";

export default function ResetPasswordForm() {
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    const invalid = validatePassword(pw);
    if (invalid) return setError(invalid);
    if (pw !== confirm) return setError("Les deux mots de passe ne sont pas identiques.");
    setLoading(true);
    const { error: err } = await createClient().auth.updateUser({ password: pw });
    setLoading(false);
    if (err) return setError("Le mot de passe n'a pas pu être modifié : le lien a peut-être expiré. Refaites une demande.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-soft text-accent"><KeyRound size={26} strokeWidth={1.7} /></span>
      <h1 className="mt-5 text-[28px]">Nouveau mot de passe</h1>
      <p className="mt-2 text-ink-secondary">Choisissez un mot de passe d&apos;au moins 8 caractères, avec une lettre et un chiffre.</p>
      <div className="mt-8 space-y-5">
        <div><label className="label" htmlFor="pw">Nouveau mot de passe</label><input id="pw" type="password" className="input" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></div>
        <div><label className="label" htmlFor="pw2">Confirmer le mot de passe</label><input id="pw2" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" onKeyDown={(e) => e.key === "Enter" && submit()} /></div>
      </div>
      {error && <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-[15px]">{error}</p>}
      <button type="button" className="btn-primary mt-6 w-full" onClick={submit} disabled={loading}>{loading ? "Enregistrement…" : "Enregistrer le mot de passe"}</button>
    </div>
  );
}
