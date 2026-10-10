import { auditOutput } from "@/lib/ai/schemas";
import { auditSeries } from "@/lib/auditTrend";

const W = 220;
const H = 56;
const dateFr = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });

function Spark({ pts }: { pts: number[] }) {
  if (pts.length < 2) return <p className="caption">Un deuxième audit montrera l&apos;évolution.</p>;
  const x = (i: number) => 6 + (i * (W - 12)) / (pts.length - 1);
  const y = (v: number) => H - 6 - (v / 100) * (H - 12);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-14 w-full max-w-[240px]" role="img" aria-label={`Scores successifs : ${pts.join(", ")}`}>
      <polyline fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" className="text-accent" points={pts.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
      {pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r="3" className="fill-accent" />)}
    </svg>
  );
}

/** Évolution du score de chaque réseau, avec les forces et faiblesses du dernier audit. */
export default function AuditTrend({ rows }: { rows: { id: string; created_at: string; report_data: unknown }[] }) {
  const series = auditSeries(rows);
  if (series.length === 0) return null;
  const byId = new Map(rows.map((r) => [r.id, r]));
  return (
    <section className="mt-14" aria-labelledby="trend-h">
      <h2 id="trend-h" className="section-title">Évolution par réseau</h2>
      <p className="mt-1 text-[15px] text-ink-secondary">Refaites un audit après vos actions : le score compare chaque réseau à lui-même.</p>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {series.map((s) => {
          const report = auditOutput.safeParse(byId.get(s.last.id)?.report_data);
          return (
            <article key={s.network} className="card-flat !p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="eyebrow">{s.network}</p>
                  <p className="num text-[34px] font-semibold leading-none">{s.last.score}<span className="text-[16px] font-medium text-ink-secondary"> / 100</span></p>
                  <p className="caption mt-1">Dernier audit : {dateFr(s.last.date)}{s.delta !== null && <> · <span className={s.delta > 0 ? "font-semibold text-success" : s.delta < 0 ? "font-semibold text-danger" : ""}>{s.delta > 0 ? "+" : ""}{s.delta} point{Math.abs(s.delta) > 1 ? "s" : ""}</span></>}</p>
                </div>
                <Spark pts={s.points.map((p) => p.score)} />
              </div>
              {report.success && (
                <div className="mt-4 grid gap-3 text-[14px] sm:grid-cols-2">
                  <div><p className="caption">Forces</p><ul className="mt-1 list-disc space-y-0.5 pl-4">{report.data.strengths.slice(0, 3).map((x, i) => <li key={i}>{x.title}</li>)}</ul></div>
                  <div><p className="caption">À améliorer</p><ul className="mt-1 list-disc space-y-0.5 pl-4">{report.data.improvements.slice(0, 3).map((x, i) => <li key={i}>{x.title}</li>)}</ul></div>
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
