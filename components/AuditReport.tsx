import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { auditOutput, type AuditOutput } from "@/lib/ai/schemas";
import ScoreRing from "./ScoreRing";

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
      <section className="card-flat relative overflow-hidden !p-8" aria-label="Score global">
        <div aria-hidden className="mesh absolute inset-0 opacity-70" />
        <div className="relative flex flex-col items-center gap-7 text-center sm:flex-row sm:text-left">
          <ScoreRing value={r.score} size={140} stroke={13} label={`Score global : ${Math.round(r.score)} sur 100`} />
          <div>
            <p className="eyebrow">Score global{r.network ? ` · ${r.network}` : ""}</p>
            <p className="num mt-1 text-[44px] font-semibold leading-none tracking-[-0.03em]">{Math.round(r.score)}<span className="text-[22px] font-medium text-ink-secondary"> / 100</span></p>
            <p className="mt-3 max-w-2xl text-[17px] leading-relaxed text-ink-secondary">{r.summary}</p>
          </div>
        </div>
      </section>

      <section aria-labelledby="strengths-h">
        <h2 id="strengths-h" className="section-title flex items-center gap-2.5"><CheckCircle2 size={22} className="text-success" />Points forts</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {r.strengths.map((s, i) => (
            <article key={i} className="card-flat border-l-4 !border-l-success/70 !p-6">
              <h3 className="text-[17px]">{s.title}</h3>
              <p className="mt-1 text-[15px] text-ink-secondary">{s.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section aria-labelledby="improvements-h">
        <h2 id="improvements-h" className="section-title flex items-center gap-2.5"><AlertTriangle size={22} className="text-warning" />Points d&apos;amélioration</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {r.improvements.map((s, i) => (
            <article key={i} className="card-flat !p-6">
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
