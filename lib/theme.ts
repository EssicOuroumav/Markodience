/**
 * Thème de marque : à partir de la couleur principale d'une marque, on dérive la palette d'accentuation
 * de l'interface (boutons, onglets actifs, barres, anneaux…). Le contraste avec le texte blanc est garanti.
 */
export type Rgb = [number, number, number];

export const DEFAULT_BRAND_COLOR = "#0071E3";
const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

export function parseHex(hex: string | null | undefined): Rgb | null {
  const m = /^#?([0-9a-f]{6})$/i.exec((hex ?? "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

const toHex = ([r, g, b]: Rgb) => "#" + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
const channels = ([r, g, b]: Rgb) => `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

function luminance([r, g, b]: Rgb) {
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

export function contrast(a: Rgb, b: Rgb) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** Couleur d'accentuation : la couleur de la marque, assombrie si besoin pour que le texte blanc reste lisible (≥ 4,5:1). */
export function accentFrom(hex: string | null | undefined): Rgb {
  let c = parseHex(hex) ?? (parseHex(DEFAULT_BRAND_COLOR) as Rgb);
  for (let i = 0; i < 30 && contrast(WHITE, c) < 4.5; i++) c = mix(c, BLACK, 0.08);
  return c;
}

/** Variables CSS à poser sur le conteneur du tableau de bord. */
export function brandTheme(hex: string | null | undefined): Record<string, string> {
  const accent = accentFrom(hex);
  const strong = mix(accent, BLACK, 0.2);
  const light = mix(accent, WHITE, 0.38);
  const soft = mix(accent, WHITE, 0.9);
  return {
    "--rgb-accent": channels(accent),
    "--rgb-accent-strong": channels(strong),
    "--rgb-accent-light": channels(light),
    "--rgb-accent-soft": channels(soft),
    "--color-accent": toHex(accent),
    "--color-accent-strong": toHex(strong),
    "--color-accent-soft": toHex(soft),
  };
}
