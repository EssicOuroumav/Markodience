"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginForm({ notice }: { notice?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Renseignez votre email et votre mot de passe.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    if (err) {
      setError("Email ou mot de passe incorrect.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-center px-6 pb-12 pt-24">
      <h1 className="text-[28px]">Connexion</h1>
      {notice && <p role="status" className="mt-4 rounded-btn bg-warning/15 px-4 py-3 text-[15px]">{notice}</p>}
      <div className="mt-8 space-y-5">
        <div>
          <label className="label" htmlFor="email">Email</label>
          <input id="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        </div>
        <div>
          <label className="label" htmlFor="password">Mot de passe</label>
          <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" onKeyDown={(e) => e.key === "Enter" && handleLogin()} />
        </div>
      </div>
      {error && <p role="alert" className="mt-4 text-[15px] text-danger">{error}</p>}
      <button type="button" className="btn-primary mt-6 w-full" onClick={handleLogin} disabled={loading}>
        {loading ? "Connexion…" : "Se connecter"}
      </button>
      <p className="caption mt-4 text-center">
        Pas encore de compte ? <a className="text-accent" href="/signup">Créer mon espace</a>
      </p>
    </main>
  );
}
