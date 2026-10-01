/** Anneau de score : couleur selon le niveau, chiffre au centre. Décoratif, la valeur est aussi en texte. */
export default function ScoreRing({ value, size = 96, stroke = 9, label, className = "" }: { value: number; size?: number; stroke?: number; label?: string; className?: string }) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const tone = v >= 75 ? "stroke-success" : v >= 50 ? "stroke-accent" : v >= 30 ? "stroke-warning" : "stroke-danger";
  return (
    <div className={`relative inline-flex shrink-0 items-center justify-center ${className}`} style={{ width: size, height: size }} role="img" aria-label={label ?? `${v} sur 100`}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-black/[0.06]" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c - (v / 100) * c} className={tone} style={{ "--ring-c": c, "--ring-to": c - (v / 100) * c, animation: "ring-in 1.3s cubic-bezier(0.2, 0.7, 0.2, 1) both" } as React.CSSProperties} />
      </svg>
      <span className="num fade-in absolute font-semibold tracking-[-0.03em]" style={{ fontSize: size * 0.3 }}>{v}</span>
    </div>
  );
}
