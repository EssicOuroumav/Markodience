"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";
import Navbar from "@/components/Navbar";

/** Erreur survenue dans une page publique : l'incident est signalé à Sentry, l'utilisateur peut réessayer. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <>
      <Navbar />
      <main className="flex min-h-screen items-center justify-center bg-canvas px-5 pb-16 pt-24">
        <section role="alert" className="w-full max-w-lg rounded-[32px] bg-white p-8 text-center shadow-pop md:p-10">
          <h1 className="text-[30px] leading-tight">Un problème est survenu</h1>
          <p className="mx-auto mt-3 max-w-sm text-[17px] text-ink-secondary">L’incident a été signalé. Vous pouvez réessayer ou revenir à l’accueil.</p>
          {error.digest && <p className="caption mt-3">Référence : {error.digest}</p>}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <button type="button" className="btn-primary" onClick={reset}><RotateCcw size={18} />Réessayer</button>
            <Link href="/" className="btn-ghost">Accueil</Link>
          </div>
        </section>
      </main>
    </>
  );
}
