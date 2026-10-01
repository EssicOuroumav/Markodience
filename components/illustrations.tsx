/**
 * Illustrations vectorielles maison, dans la palette Markodience (bleu unique + neutres).
 * Chaque illustration est décorative (aria-hidden) et s'adapte à la largeur disponible.
 */
type P = { className?: string };
const base = { viewBox: "0 0 240 180", fill: "none", "aria-hidden": true as const, role: "presentation" as const };
const card = "fill-white stroke-[#e8e8ed]";

export function IlloCalendar({ className }: P) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="86" ry="8" className="fill-accent/10" />
      <rect x="30" y="22" width="180" height="134" rx="18" className={card} strokeWidth="1.5" />
      <path d="M30 40a18 18 0 0 1 18-18h144a18 18 0 0 1 18 18v14H30V40Z" className="fill-accent" />
      <circle cx="68" cy="22" r="5" className="fill-white stroke-accent" strokeWidth="2.5" />
      <circle cx="172" cy="22" r="5" className="fill-white stroke-accent" strokeWidth="2.5" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => {
          const hot = (r === 0 && c === 1) || (r === 1 && c === 3) || (r === 2 && c === 0);
          const mid = (r === 0 && c === 3) || (r === 2 && c === 2);
          return <rect key={`${r}${c}`} x={46 + c * 40} y={68 + r * 28} width="30" height="18" rx="6" className={hot ? "fill-accent" : mid ? "fill-accent/30" : "fill-canvas"} />;
        }),
      )}
      <circle cx="204" cy="146" r="17" className="fill-success" />
      <path d="m196 146 6 6 10-12" className="stroke-white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IlloChart({ className }: P) {
  const bars = [44, 70, 56, 92, 78, 108];
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="86" ry="8" className="fill-accent/10" />
      <rect x="26" y="20" width="188" height="136" rx="18" className={card} strokeWidth="1.5" />
      {[0, 1, 2].map((i) => (<line key={i} x1="44" x2="196" y1={60 + i * 32} y2={60 + i * 32} className="stroke-[#eeeef2]" strokeWidth="1.5" />))}
      {bars.map((h, i) => (<rect key={i} x={48 + i * 24} y={140 - h} width="14" height={h} rx="6" className={i === bars.length - 1 ? "fill-accent" : "fill-accent/25"} />))}
      <path d="M55 112 L79 92 L103 100 L127 66 L151 78 L175 44" className="stroke-accent" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="175" cy="44" r="6" className="fill-white stroke-accent" strokeWidth="3" />
      <rect x="150" y="14" width="56" height="24" rx="12" className="fill-night" />
      <path d="m162 28 5-5 4 4 6-7" className="stroke-success" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="182" y="22" width="16" height="3.5" rx="1.75" className="fill-white" />
    </svg>
  );
}

export function IlloChat({ className }: P) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="86" ry="8" className="fill-accent/10" />
      <path d="M40 40a16 16 0 0 1 16-16h96a16 16 0 0 1 16 16v44a16 16 0 0 1-16 16H84l-24 20V100h-4a16 16 0 0 1-16-16V40Z" className="fill-accent" />
      <rect x="58" y="42" width="84" height="6" rx="3" className="fill-white" />
      <rect x="58" y="56" width="64" height="6" rx="3" className="fill-white/70" />
      <rect x="58" y="70" width="74" height="6" rx="3" className="fill-white/70" />
      <path d="M200 96a14 14 0 0 0-14-14h-62a14 14 0 0 0-14 14v36a14 14 0 0 0 14 14h54l22 18v-18a14 14 0 0 0 0-50Z" className={card} strokeWidth="1.5" transform="translate(-8 0)" />
      <rect x="120" y="98" width="58" height="6" rx="3" className="fill-canvas" />
      <rect x="120" y="112" width="42" height="6" rx="3" className="fill-canvas" />
      <path d="M176 126c-4-3-8-6-8-9a4 4 0 0 1 8-1 4 4 0 0 1 8 1c0 3-4 6-8 9Z" className="fill-danger" transform="translate(6 -2)" />
      <circle cx="214" cy="40" r="14" className="fill-accent/15" />
      <path d="m208 40 4 4 8-9" className="stroke-accent" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IlloPillars({ className }: P) {
  const cols = [
    { x: 38, h: 70, c: "fill-accent/25" },
    { x: 80, h: 108, c: "fill-accent" },
    { x: 122, h: 88, c: "fill-accent/55" },
    { x: 164, h: 120, c: "fill-accent-strong" },
  ];
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="90" ry="8" className="fill-accent/10" />
      <rect x="24" y="146" width="192" height="10" rx="5" className="fill-[#e8e8ed]" />
      {cols.map((c) => (
        <g key={c.x}>
          <rect x={c.x} y={146 - c.h} width="36" height={c.h} rx="10" className={c.c} />
          <circle cx={c.x + 18} cy={146 - c.h + 18} r="7" className="fill-white/90" />
          <rect x={c.x + 8} y={146 - c.h + 34} width="20" height="4" rx="2" className="fill-white/70" />
          <rect x={c.x + 8} y={146 - c.h + 44} width="14" height="4" rx="2" className="fill-white/50" />
        </g>
      ))}
      <path d="m196 24 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" className="fill-warning" />
    </svg>
  );
}

export function IlloIdentity({ className }: P) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="86" ry="8" className="fill-accent/10" />
      <rect x="28" y="22" width="184" height="134" rx="18" className={card} strokeWidth="1.5" />
      <circle cx="68" cy="66" r="24" className="fill-accent" />
      <path d="M58 66l7 7 12-14" className="stroke-white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="104" y="48" width="84" height="8" rx="4" className="fill-ink/80" />
      <rect x="104" y="64" width="62" height="6" rx="3" className="fill-canvas" />
      <rect x="104" y="76" width="72" height="6" rx="3" className="fill-canvas" />
      {["fill-accent", "fill-accent/60", "fill-night", "fill-warning", "fill-success"].map((c, i) => (<circle key={i} cx={52 + i * 30} cy="124" r="13" className={c} />))}
      <rect x="44" y="104" width="152" height="1.5" rx="1" className="fill-[#eeeef2]" />
      <path d="m204 18 3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" className="fill-accent" />
    </svg>
  );
}

export function IlloAudit({ className }: P) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="86" ry="8" className="fill-accent/10" />
      <rect x="40" y="18" width="120" height="140" rx="16" className={card} strokeWidth="1.5" />
      <rect x="58" y="38" width="70" height="7" rx="3.5" className="fill-ink/80" />
      {[58, 72, 86].map((y) => (<rect key={y} x="58" y={y} width={y === 72 ? 56 : 84} height="6" rx="3" className="fill-canvas" />))}
      <rect x="58" y="108" width="84" height="30" rx="10" className="fill-accent-soft" />
      <path d="M68 128l12-12 10 8 18-16" className="stroke-accent" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="170" cy="96" r="34" className="fill-white/70 stroke-accent" strokeWidth="9" />
      <circle cx="170" cy="96" r="22" className="fill-accent-soft" />
      <text x="170" y="103" textAnchor="middle" className="fill-accent" style={{ font: "700 20px Inter, sans-serif" }}>86</text>
      <path d="m194 120 22 24" className="stroke-night" strokeWidth="10" strokeLinecap="round" />
    </svg>
  );
}

export function IlloRules({ className }: P) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="86" ry="8" className="fill-accent/10" />
      <rect x="34" y="20" width="172" height="138" rx="18" className={card} strokeWidth="1.5" />
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x="52" y={38 + i * 29} width="20" height="20" rx="7" className={i < 3 ? "fill-accent" : "fill-white stroke-line"} strokeWidth="2" />
          {i < 3 && <path d={`m57 ${48 + i * 29} 4 4 7-8`} className="stroke-white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />}
          <rect x="84" y={42 + i * 29} width={[92, 76, 84, 62][i]} height="7" rx="3.5" className={i < 3 ? "fill-ink/75" : "fill-canvas"} />
          <rect x="84" y={53 + i * 29} width={[56, 44, 60, 40][i]} height="5" rx="2.5" className="fill-canvas" />
        </g>
      ))}
    </svg>
  );
}

export function IlloLive({ className }: P) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="90" ry="8" className="fill-accent/10" />
      <rect x="26" y="22" width="188" height="118" rx="18" className="fill-night" />
      <rect x="26" y="22" width="188" height="118" rx="18" className="fill-accent/25" />
      <circle cx="120" cy="80" r="26" className="fill-white/95" />
      <path d="m112 66 24 14-24 14V66Z" className="fill-accent" />
      <rect x="40" y="34" width="46" height="20" rx="10" className="fill-danger" />
      <circle cx="53" cy="44" r="4" className="fill-white" />
      <rect x="62" y="41" width="18" height="6" rx="3" className="fill-white" />
      <rect x="40" y="122" width="100" height="5" rx="2.5" className="fill-white/60" />
      <rect x="40" y="122" width="58" height="5" rx="2.5" className="fill-accent" />
      {[0, 1, 2].map((i) => (<circle key={i} cx={60 + i * 26} cy="156" r="11" className={["fill-accent", "fill-warning", "fill-success"][i]} stroke="white" strokeWidth="3" />))}
      <rect x="150" y="150" width="56" height="12" rx="6" className="fill-white stroke-[#e8e8ed]" />
    </svg>
  );
}

/** Illustration générique « démarrer » : cartes empilées et bouton plus. */
export function IlloStart({ className }: P) {
  return (
    <svg {...base} className={className}>
      <ellipse cx="120" cy="164" rx="80" ry="8" className="fill-accent/10" />
      <rect x="52" y="34" width="136" height="96" rx="16" className="fill-accent/10" transform="rotate(-6 120 82)" />
      <rect x="52" y="34" width="136" height="96" rx="16" className="fill-accent/20" transform="rotate(5 120 82)" />
      <rect x="48" y="30" width="144" height="104" rx="18" className={card} strokeWidth="1.5" />
      <rect x="66" y="50" width="60" height="8" rx="4" className="fill-ink/80" />
      <rect x="66" y="66" width="104" height="6" rx="3" className="fill-canvas" />
      <rect x="66" y="78" width="84" height="6" rx="3" className="fill-canvas" />
      <circle cx="170" cy="124" r="22" className="fill-accent" />
      <path d="M170 114v20M160 124h20" className="stroke-white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

export const ILLUSTRATIONS = {
  calendar: IlloCalendar,
  chart: IlloChart,
  chat: IlloChat,
  pillars: IlloPillars,
  identity: IlloIdentity,
  audit: IlloAudit,
  rules: IlloRules,
  live: IlloLive,
  start: IlloStart,
} as const;
export type IllustrationName = keyof typeof ILLUSTRATIONS;
