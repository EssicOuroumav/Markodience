"use client";

import Image from "next/image";
import { useState } from "react";
import { IlloStart } from "./illustrations";

/**
 * Photo en `object-cover` dans un cadre arrondi. Si le fichier est absent ou illisible,
 * un visuel de remplacement élégant s'affiche à la place (la page ne casse jamais).
 */
export default function Photo({ src, alt, className = "", sizes = "(min-width: 1024px) 40vw, 90vw", priority = false }: { src: string; alt: string; className?: string; sizes?: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div role="img" aria-label={alt} className={`mesh flex items-center justify-center bg-accent-soft/70 ${className}`}>
        <IlloStart className="w-2/3 max-w-[260px]" />
      </div>
    );
  }
  return (
    <div className={`relative overflow-hidden ${className}`}>
      <Image src={src} alt={alt} fill sizes={sizes} priority={priority} className="object-cover" onError={() => setFailed(true)} />
    </div>
  );
}
