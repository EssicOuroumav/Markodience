"use client";

import Image from "next/image";
import { useState } from "react";

/**
 * Photo en `object-cover` dans un cadre arrondi. Si le fichier est absent ou illisible,
 * le visuel de remplacement (`fallback`, par exemple une illustration) s'affiche : la page ne casse jamais.
 */
export default function Photo({ src, alt, fallback, className = "", sizes = "(min-width: 1024px) 40vw, 90vw", priority = false, objectPosition }: { src: string; alt: string; fallback: React.ReactNode; className?: string; sizes?: string; priority?: boolean; objectPosition?: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <div className={className}>{fallback}</div>;
  return (
    <div className={`${className.includes("absolute") ? "" : "relative"} overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" style={objectPosition ? { objectPosition } : undefined} onError={() => setFailed(true)} />
    </div>
  );
}
