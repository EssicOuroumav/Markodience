import { auditOutput, type AuditOutput } from "@/lib/ai/schemas";

const PRIORITY: Record<AuditOutput["improvements"][number]["priority"], { label: string; cls: string }> = {
  faible: { label: "Priorité faible", cls: "bg-black/10 text-ink" },
  modere: { label: "Priorité modérée", cls: "bg-warning/25 text-ink" },
  eleve: { label: "Priorité élevée", cls: "bg-danger/20 text-ink" },
};

/** Rendu 100 % composants React : tout le contenu généré est du texte, jamais du HTML. */
export default function AuditReport({ data }: { data: unknown }) {
  const parsed = auditOutput.safeParse(data);
  if (!parsed.success) {
    return <div role="alert" className="card">Ce rapport est illisible. Relancez un audit.</div>;
  }
  const r = parsed.data;
  return (
    <div className="space-y-8">
      <section className="card text-center" aria-label="Score global">
        <p className="caption">Score global</p>
        <p className="text-[56px] font-semibold leading-none tracking-heading">
          {Math.round(r.score)}<span className="text-[24px] text-ink-secondary">/100</span>
        </p>
        <p className="mx-auto mt-4 max-w-2xl text-ink-secondary">{r.summary}</p>
      </section>

      <section aria-labelledby="strengths-h">
        <h2 id="strengths-h" className="text-[22px]">Points forts</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {r.strengths.map((s, i) => (
            <article key={i} className="card">
              <h3 className="text-[17px]">{s.title}</h3>
              <p className="mt-1 text-[15px] text-ink-secondary">{s.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="improvements-h">
        <h2 id="improvements-h" className="text-[22px]">Points d&apos;amélioration</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {r.improvements.map((s, i) => (
            <article key={i} className="card">
              <span className={`inline-block rounded-pill px-3 py-1 text-[12px] font-medium ${PRIORITY[s.priority].cls}`}>{PRIORITY[s.priority].label}</span>
              <h3 className="mt-2 text-[17px]">{s.title}</h3>
              <p className="mt-1 text-[15px] text-ink-secondary">{s.description}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
