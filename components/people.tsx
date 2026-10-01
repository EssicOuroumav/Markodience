/**
 * Illustrations de personnages (community managers), dessinées en vectoriel dans la palette Markodience.
 * Décoratives (aria-hidden). Les teintes de peau, coiffures et tenues varient pour refléter la diversité du public.
 */
type P = { className?: string };
const SK = { deep: "#4E2F1B", dark: "#6B4226", mid: "#8A5A3C", warm: "#A8704A" };
const base = { fill: "none", "aria-hidden": true as const, role: "presentation" as const };

/** Visage : tête, oreilles, yeux, sourcil, sourire. (cx, cy) = centre de la tête. */
function Face({ cx, cy, skin, smile = 1, beard = false }: { cx: number; cy: number; skin: string; smile?: number; beard?: boolean }) {
  return (
    <g>
      <rect x={cx - 15} y={cy + 38} width="30" height="46" rx="14" fill={skin} />
      <ellipse cx={cx - 50} cy={cy + 4} rx="8" ry="13" fill={skin} />
      <ellipse cx={cx + 50} cy={cy + 4} rx="8" ry="13" fill={skin} />
      <ellipse cx={cx} cy={cy} rx="50" ry="58" fill={skin} />
      {beard && <path d={`M${cx - 48} ${cy + 18}c4 38 26 56 48 56s44-18 48-56c-12 14-28 20-48 20s-36-6-48-20Z`} fill="#1d1d1f" opacity="0.9" />}
      <ellipse cx={cx - 19} cy={cy + 2} rx="4.6" ry="5.6" fill="#1d1d1f" />
      <ellipse cx={cx + 19} cy={cy + 2} rx="4.6" ry="5.6" fill="#1d1d1f" />
      <path d={`M${cx - 28} ${cy - 14}q9-6 18-1M${cx + 10} ${cy - 15}q9-5 18 1`} stroke="#1d1d1f" strokeWidth="3" strokeLinecap="round" opacity="0.8" />
      <path d={`M${cx - 4} ${cy + 8}q4 10 8 0`} stroke="#00000030" strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M${cx - 17} ${cy + 26}q17 ${22 * smile} 34 0`} stroke={beard ? "#fff" : "#2b1408"} strokeWidth="3.2" strokeLinecap="round" />
    </g>
  );
}

function Laptop({ x, y, w = 190, tint = "fill-accent" }: { x: number; y: number; w?: number; tint?: string }) {
  const h = w * 0.62;
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="12" className="fill-night" />
      <rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} rx="7" className="fill-white" />
      <rect x={x + 18} y={y + 20} width={w * 0.42} height="9" rx="4.5" className="fill-ink/80" />
      <rect x={x + 18} y={y + 36} width={w * 0.62} height="6" rx="3" className="fill-canvas" />
      <rect x={x + 18} y={y + 50} width={w * 0.1} height={h - 78} rx="4" className={tint} opacity="0.35" />
      <rect x={x + 18 + w * 0.14} y={y + 50 + (h - 78) * 0.3} width={w * 0.1} height={(h - 78) * 0.7} rx="4" className={tint} opacity="0.6" />
      <rect x={x + 18 + w * 0.28} y={y + 50 + (h - 78) * 0.1} width={w * 0.1} height={(h - 78) * 0.9} rx="4" className={tint} />
      <rect x={x + 18 + w * 0.42} y={y + 50 + (h - 78) * 0.45} width={w * 0.1} height={(h - 78) * 0.55} rx="4" className={tint} opacity="0.5" />
      <path d={`M${x - 14} ${y + h + 6}h${w + 28}l-8 12h-${w + 12}Z`} fill="#c9ced8" />
    </g>
  );
}

const Heart = ({ x, y }: { x: number; y: number }) => (
  <g className="floaty">
    <circle cx={x} cy={y} r="26" className="fill-white" stroke="#e8e8ed" strokeWidth="1.5" />
    <path d={`M${x} ${y + 11}c-14-9-16-17-9-21 4-2 8 0 9 4 1-4 5-6 9-4 7 4 5 12-9 21Z`} className="fill-danger" />
  </g>
);
const Bubble = ({ x, y }: { x: number; y: number }) => (
  <g className="floaty-slow">
    <rect x={x} y={y} width="104" height="52" rx="18" className="fill-white" stroke="#e8e8ed" strokeWidth="1.5" />
    <path d={`M${x + 22} ${y + 52}l-8 14 22-14Z`} className="fill-white" />
    {[0, 1, 2].map((i) => (<circle key={i} cx={x + 30 + i * 22} cy={y + 26} r="6" className={i === 1 ? "fill-accent" : "fill-accent/35"} />))}
  </g>
);
const Growth = ({ x, y }: { x: number; y: number }) => (
  <g className="floaty">
    <rect x={x} y={y} width="116" height="64" rx="18" className="fill-night" />
    <path d={`M${x + 16} ${y + 44}l20-16 14 10 22-24 20 8`} className="stroke-success" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    <rect x={x + 76} y={y + 10} width="30" height="16" rx="8" className="fill-success" />
  </g>
);
const Check = ({ x, y }: { x: number; y: number }) => (
  <g className="floaty-slow">
    <circle cx={x} cy={y} r="24" className="fill-success" />
    <path d={`m${x - 10} ${y} 7 8 14-16`} stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
  </g>
);

/** Grande scène de l'en-tête : une community manager au travail (format portrait). */
export function PersonaHero({ className }: P) {
  return (
    <svg viewBox="0 0 480 600" {...base} className={className}>
      <rect width="480" height="600" rx="40" className="fill-accent-soft" />
      <circle cx="390" cy="110" r="130" className="fill-white" opacity="0.6" />
      <circle cx="70" cy="520" r="110" className="fill-accent/10" />
      <rect y="470" width="480" height="130" className="fill-[#dfe7f5]" />
      <path d="M130 600c0-80 12-150 55-165 20-7 40-10 55-10s35 3 55 10c43 15 55 85 55 165Z" className="fill-accent-strong" />
      <path d="M205 430l35 42 35-42" className="fill-white" />
      <Face cx={240} cy={322} skin={SK.mid} />
      <path d="M184 316c-4-62 36-92 62-92 40 0 66 34 60 92-14-30-34-46-60-46s-48 16-62 46Z" fill="#F59E0B" />
      <path d="M200 262l36-18M214 276l58-30M236 270l50-22" stroke="#B45309" strokeWidth="5" strokeLinecap="round" />
      {[210, 248, 280, 226, 264].map((x, i) => (<circle key={i} cx={x} cy={252 + (i % 3) * 14} r="3.5" fill="#fff" opacity="0.9" />))}
      <ellipse cx="296" cy="236" rx="26" ry="20" fill="#F59E0B" transform="rotate(-24 296 236)" />
      <path d="M278 232l36-14" stroke="#B45309" strokeWidth="5" strokeLinecap="round" />
      <circle cx="188" cy="342" r="6" fill="#fbbf24" /><circle cx="292" cy="342" r="6" fill="#fbbf24" />
      <Laptop x={146} y={452} w={190} />
      <rect x="318" y="440" width="62" height="104" rx="12" className="fill-night" transform="rotate(14 349 492)" />
      <rect x="324" y="448" width="50" height="86" rx="8" className="fill-white" transform="rotate(14 349 492)" />
      <circle cx="339" cy="478" r="9" className="fill-accent" transform="rotate(14 349 492)" />
      <path d="M296 480c14-4 24 4 34 12" stroke={SK.mid} strokeWidth="18" strokeLinecap="round" />
      <Bubble x={34} y={120} />
      <Heart x={420} y={236} />
      <Growth x={30} y={380} />
      <Check x={410} y={406} />
    </svg>
  );
}

/** Aspirante : cheveux afro, ordinateur et ampoule d'idée. */
export function PersonaAspirant({ className }: P) {
  return (
    <svg viewBox="0 0 480 360" {...base} className={className}>
      <rect width="480" height="360" className="fill-accent-soft" />
      <circle cx="410" cy="60" r="90" className="fill-white" opacity="0.6" />
      <circle cx="60" cy="330" r="80" className="fill-accent/10" />
      <rect y="290" width="480" height="70" className="fill-[#dfe7f5]" />
      <circle cx="236" cy="150" r="80" fill="#1d1d1f" />
      <path d="M120 360c0-60 14-100 50-110 20-6 44-8 66-8s46 2 66 8c36 10 50 50 50 110Z" fill="#C2410C" />
      <path d="M200 252l36 36 36-36" className="fill-white" />
      <Face cx={236} cy={160} skin={SK.dark} />
      <path d="M186 118c14-20 38-30 50-30s38 10 52 30c-18-10-34-14-52-14s-34 4-50 14Z" fill="#1d1d1f" />
      <Laptop x={144} y={252} w={186} />
      <g className="floaty">
        <circle cx="372" cy="104" r="30" className="fill-warning" />
        <path d="M362 112c-8-6-8-20 3-26 9-4 20 2 21 12 1 7-3 10-7 14v6h-12v-6Zm2 18h18" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <Bubble x={34} y={70} />
      <Check x={400} y={238} />
    </svg>
  );
}

/** Confirmé : barbe courte, smartphone en main, calendrier de publications. */
export function PersonaConfirmed({ className }: P) {
  return (
    <svg viewBox="0 0 480 360" {...base} className={className}>
      <rect width="480" height="360" className="fill-accent-soft" />
      <circle cx="70" cy="70" r="90" className="fill-white" opacity="0.6" />
      <circle cx="430" cy="320" r="90" className="fill-accent/10" />
      <rect y="300" width="480" height="60" className="fill-[#dfe7f5]" />
      <path d="M124 360c0-64 12-106 52-116 20-5 42-7 64-7s44 2 64 7c40 10 52 52 52 116Z" className="fill-night" />
      <path d="M206 246l34 34 34-34" className="fill-white" />
      <Face cx={240} cy={150} skin={SK.deep} beard />
      <path d="M190 112c0-30 24-52 50-52s50 22 50 52c-14-14-30-20-50-20s-36 6-50 20Z" fill="#1d1d1f" />
      <rect x="306" y="190" width="80" height="136" rx="16" className="fill-night" transform="rotate(10 346 258)" />
      <rect x="313" y="199" width="66" height="118" rx="10" className="fill-white" transform="rotate(10 346 258)" />
      <g transform="rotate(10 346 258)">
        <rect x="322" y="210" width="48" height="10" rx="5" className="fill-ink/80" />
        {[0, 1, 2].map((r) => [0, 1, 2].map((c) => (<rect key={`${r}${c}`} x={322 + c * 16} y={230 + r * 20} width="13" height="14" rx="4" className={(r + c) % 3 === 0 ? "fill-accent" : "fill-canvas"} />)))}
      </g>
      <path d="M290 292c14-10 26-14 40-10" stroke={SK.deep} strokeWidth="20" strokeLinecap="round" />
      <Heart x={92} y={150} />
      <Growth x={30} y={226} />
      <Check x={420} y={110} />
    </svg>
  );
}

/** Équipe d'agence : trois profils autour d'un grand écran. */
export function PersonaTeam({ className }: P) {
  const bust = (cx: number, skin: string, cloth: string, hair: "afro" | "short" | "wrap", beard = false) => (
    <g>
      <path d={`M${cx - 74} 360c0-48 8-78 36-86 12-4 26-6 38-6s26 2 38 6c28 8 36 38 36 86Z`} fill={cloth} />
      <Face cx={cx} cy={196} skin={skin} beard={beard} />
      {hair === "afro" && <path d={`M${cx - 58} 190c-14-50 22-92 58-92s72 42 58 92c-12-26-30-38-58-38s-46 12-58 38Z`} fill="#1d1d1f" />}
      {hair === "short" && <path d={`M${cx - 50} 178c0-30 22-52 50-52s50 22 50 52c-14-14-30-20-50-20s-36 6-50 20Z`} fill="#1d1d1f" />}
      {hair === "wrap" && <path d={`M${cx - 52} 190c-4-56 30-84 52-84 34 0 58 30 52 84-14-26-30-40-52-40s-38 14-52 40Z`} fill="#0F766E" />}
    </g>
  );
  return (
    <svg viewBox="0 0 480 360" {...base} className={className}>
      <rect width="480" height="360" className="fill-accent-soft" />
      <circle cx="420" cy="50" r="90" className="fill-white" opacity="0.6" />
      <circle cx="40" cy="330" r="80" className="fill-accent/10" />
      <rect x="110" y="26" width="260" height="124" rx="16" className="fill-night" />
      <rect x="118" y="34" width="244" height="108" rx="10" className="fill-white" />
      <rect x="132" y="46" width="90" height="9" rx="4.5" className="fill-ink/80" />
      {[0, 1, 2, 3, 4, 5].map((i) => (<rect key={i} x={134 + i * 34} y={130 - [30, 52, 40, 74, 58, 88][i]} width="22" height={[30, 52, 40, 74, 58, 88][i]} rx="6" className={i === 5 ? "fill-accent" : "fill-accent/30"} />))}
      <path d="M140 108l40-22 40 10 44-34 44 14 40-26" className="stroke-success" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      {bust(110, SK.warm, "#C2410C", "short")}
      {bust(240, SK.dark, "#1d1d1f", "afro")}
      {bust(370, SK.mid, "#0071e3", "wrap", false)}
      <g className="floaty"><circle cx="438" cy="170" r="20" className="fill-success" /><path d="m429 170 6 7 12-14" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" /></g>
    </svg>
  );
}
