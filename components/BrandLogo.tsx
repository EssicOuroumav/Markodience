"use client";

import { useCallback, useState } from "react";

export type Shape = "square" | "round" | "wide" | "tall";
const SIZES = { xs: 28, sm: 36, md: 48, lg: 72 } as const;

/** Détecte un logo rond : coins transparents, centre plein (sur une copie réduite de l'image). */
function looksRound(img: HTMLImageElement): boolean {
  try {
    const c = document.createElement("canvas");
    c.width = c.height = 32;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    if (!ctx) return false;
    ctx.drawImage(img, 0, 0, 32, 32);
    const a = (x: number, y: number) => ctx.getImageData(x, y, 1, 1).data[3];
    const corners = [a(1, 1), a(30, 1), a(1, 30), a(30, 30)];
    return corners.every((v) => v < 24) && a(16, 16) > 200;
  } catch {
    return false; // image non lisible (CORS) : on retombe sur le carré
  }
}

/**
 * Affiche le logo d'une marque en respectant sa forme : carré, rond, rectangulaire (large) ou vertical.
 * Le logo n'est jamais rogné ni déformé ; sans logo, une pastille aux initiales prend la couleur de la marque.
 */
export default function BrandLogo({ src, name, color, size = "md", className = "", onShape }: { src: string | null; name: string; color?: string | null; size?: keyof typeof SIZES; className?: string; onShape?: (s: Shape) => void }) {
  const [shape, setShape] = useState<Shape | null>(null);
  const [cors, setCors] = useState(true);
  const h = SIZES[size];

  // L'image peut déjà être chargée avant l'hydratation (onLoad manqué) : on lit son état à la création.
  const measure = useCallback(
    (img: HTMLImageElement) => {
      const ratio = img.naturalWidth / (img.naturalHeight || 1);
      const next: Shape = ratio > 1.35 ? "wide" : ratio < 0.74 ? "tall" : cors && looksRound(img) ? "round" : "square";
      setShape(next);
      onShape?.(next);
    },
    [cors, onShape],
  );
  const attach = useCallback(
    (img: HTMLImageElement | null) => {
      if (img && img.complete && img.naturalWidth > 0) measure(img);
    },
    [measure],
  );
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("") || "M";

  if (!src) {
    return (
      <div aria-hidden className={`flex shrink-0 items-center justify-center rounded-[22%] font-semibold text-white ${className}`} style={{ width: h, height: h, background: color ?? "var(--color-accent)", fontSize: h * 0.38 }}>
        {initials}
      </div>
    );
  }

  const box: React.CSSProperties =
    shape === "wide" ? { height: h, width: "auto", maxWidth: h * 3.4 }
    : shape === "tall" ? { height: h * 1.25, width: "auto", maxWidth: h * 1.2 }
    : { height: h, width: h };
  const radius = shape === "round" ? "rounded-full" : shape === "square" || shape === null ? "rounded-[22%]" : "rounded-xl";

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={`Logo de ${name}`}
      crossOrigin={cors ? "anonymous" : undefined}
      onError={() => cors && setCors(false)}
      ref={attach}
      onLoad={(e) => measure(e.currentTarget)}
      style={box}
      className={`shrink-0 border border-[var(--color-border-soft)] bg-white object-contain p-1 shadow-card transition-opacity ${shape ? "opacity-100" : "opacity-0"} ${radius} ${className}`}
    />
  );
}
