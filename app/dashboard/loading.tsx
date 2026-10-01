/** Squelette affiché pendant le chargement d'un onglet : plus agréable qu'un écran vide. */
export default function Loading() {
  return (
    <div role="status" aria-label="Chargement" className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="shimmer h-12 w-12 rounded-2xl" />
        <div className="space-y-2"><div className="shimmer h-7 w-64 rounded-lg" /><div className="shimmer h-4 w-96 max-w-full rounded-md" /></div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        {[0, 1, 2].map((i) => (<div key={i} className="shimmer h-48 rounded-card" style={{ animationDelay: `${i * 0.15}s` }} />))}
      </div>
      <div className="shimmer h-40 rounded-card" />
    </div>
  );
}
