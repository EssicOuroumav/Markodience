/**
 * Couleur principale d'un logo : la teinte la plus présente parmi les pixels colorés (on écarte les pixels transparents,
 * blancs, noirs et gris, qui ne font pas la « couleur » d'une marque). Renvoie null pour un logo sans couleur marquée.
 */
export function dominantColor(data: ArrayLike<number>): string | null {
  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  for (let i = 0; i + 3 < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
    if (a < 128) continue;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    if (max === 0) continue;
    const sat = (max - min) / max;
    const light = (max + min) / 510;
    if (sat < 0.25 || light > 0.93 || light < 0.07) continue;
    const key = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
    const w = 1 + sat * 2;
    const cur = buckets.get(key) ?? { w: 0, r: 0, g: 0, b: 0 };
    cur.w += w; cur.r += r * w; cur.g += g * w; cur.b += b * w;
    buckets.set(key, cur);
  }
  let best: { w: number; r: number; g: number; b: number } | null = null;
  for (const v of buckets.values()) if (!best || v.w > best.w) best = v;
  if (!best) return null;
  const hex = (n: number) => Math.round(n / best!.w).toString(16).padStart(2, "0");
  return `#${hex(best.r)}${hex(best.g)}${hex(best.b)}`.toUpperCase();
}

/** Lit un fichier image dans le navigateur (réduit à 64 px) et en tire la couleur principale. */
export async function colorFromImageFile(file: File): Promise<string | null> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("image illisible"));
      el.src = url;
    });
    const scale = 64 / Math.max(img.naturalWidth, img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale)), h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return dominantColor(ctx.getImageData(0, 0, w, h).data);
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
