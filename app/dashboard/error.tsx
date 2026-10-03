"use client";

import * as Sentry from "@sentry/nextjs";
import Link from "next/link";
import { useEffect } from "react";
import { RotateCcw } from "lucide-react";

/** Erreur dans un onglet du tableau de bord : la navigation reste affichée, seul le contenu est remplacé. */
export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <section role="alert" className="card mx-auto max-w-lg text-center">
      <h1 className="text-[26px] leading-tight">Cet onglet n’a pas pu s’afficher</h1>
      <p className="mt-3 text-[16px] text-ink-secondary">L’incident a été signalé. Vos données ne sont pas perdues. Réessayez, ou passez à un autre onglet.</p>
      {error.digest && <p className="caption mt-3">Référence : {error.digest}</p>}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" className="btn-primary" onClick={reset}><RotateCcw size={18} />Réessayer</button>
        <Link href="/dashboard" className="btn-ghost">Vue d’ensemble</Link>
      </div>
    </section>
  );
}
