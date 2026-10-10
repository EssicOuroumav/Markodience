/** Évolution des audits : un score par réseau dans le temps. */
export type AuditPoint = { id: string; date: string; score: number };
export type AuditSeries = { network: string; points: AuditPoint[]; delta: number | null; last: AuditPoint };

export function auditSeries(rows: { id: string; created_at: string; report_data: unknown }[]): AuditSeries[] {
  const by = new Map<string, AuditPoint[]>();
  for (const r of rows) {
    const d = r.report_data as { score?: unknown; network?: unknown } | null;
    if (typeof d?.score !== "number" || !Number.isFinite(d.score)) continue;
    const network = typeof d.network === "string" && d.network ? d.network : "Autre";
    by.set(network, [...(by.get(network) ?? []), { id: r.id, date: r.created_at, score: Math.round(Math.max(0, Math.min(100, d.score))) }]);
  }
  return [...by.entries()]
    .map(([network, pts]) => {
      const points = pts.sort((a, b) => a.date.localeCompare(b.date));
      return { network, points, delta: points.length > 1 ? points[points.length - 1].score - points[points.length - 2].score : null, last: points[points.length - 1] };
    })
    .sort((a, b) => b.points.length - a.points.length || a.network.localeCompare(b.network));
}
