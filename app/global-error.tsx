"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Dernier filet : erreur qui casse toute la page. Elle est envoyée à Sentry puis l'utilisateur peut réessayer. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);
  return (
    <html lang="fr">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f5f5f7", color: "#1d1d1f" }}>
        <main style={{ textAlign: "center", padding: 24, maxWidth: 420 }}>
          <h1 style={{ fontSize: 24 }}>Un problème est survenu</h1>
          <p style={{ color: "#6e6e73" }}>L’incident a été signalé. Vous pouvez réessayer ou revenir à l’accueil.</p>
          <button onClick={reset} style={{ marginRight: 12, padding: "10px 20px", borderRadius: 980, border: 0, background: "#0071e3", color: "#fff", fontSize: 16, cursor: "pointer" }}>Réessayer</button>
          {/* Lien natif volontaire : cette page remplace toute l'application, le routeur peut être indisponible. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" style={{ color: "#0071e3" }}>Accueil</a>
        </main>
      </body>
    </html>
  );
}
