"use client";

import { createPortal } from "react-dom";

/**
 * Affiche un panneau par-dessus toute la page. Les contenus du tableau de bord entrent avec une animation (translate) : un élément « fixed »
 * placé dedans se positionnerait par rapport à cette zone et non à l'écran. On le monte donc à la racine du tableau de bord (qui garde le thème de la marque).
 * À n'utiliser que pour un panneau ouvert après l'affichage de la page (jamais au premier rendu serveur).
 */
export default function Overlay({ children }: { children: React.ReactNode }) {
  if (typeof document === "undefined") return null;
  return createPortal(children, document.querySelector<HTMLElement>(".studio") ?? document.body);
}
