import Photo from "./Photo";
import ProductMockup, { ScoreChip, ValidatedChip } from "./ProductMockup";
import { PersonaHero } from "./people";
import { PHOTOS } from "@/lib/photos";

/** Visuel de l'en-tête : la photo (ou, à défaut, l'illustration), avec la maquette du produit qui la chevauche. */
export default function HeroVisual() {
  const hasPhoto = !!PHOTOS.hero;
  return (
    <div className={`relative mx-auto w-full max-w-[600px] ${hasPhoto ? "pb-12 sm:pb-28" : "pb-[8.5rem] sm:pb-36"}`}>
      <div className={`relative ${hasPhoto ? "w-full" : "ml-auto w-[88%] sm:w-[78%]"}`}>
        <div aria-hidden className="absolute -inset-4 -z-10 rounded-[44px] bg-gradient-to-br from-accent/25 via-accent/5 to-transparent blur-2xl" />
        <div className={`${hasPhoto ? "aspect-[4/3]" : "aspect-[4/5]"} overflow-hidden rounded-[32px] shadow-pop ring-1 ring-black/5`}>
          {hasPhoto ? (
            <Photo src={PHOTOS.hero as string} alt="Deux community managers sourient en travaillant ensemble sur un ordinateur portable" priority sizes="(min-width: 1024px) 560px, 92vw" className="h-full w-full" fallback={<PersonaHero className="h-full w-full" />} />
          ) : (
            <PersonaHero className="h-full w-full" />
          )}
        </div>
      </div>
      <div className={`absolute bottom-0 ${hasPhoto ? "hidden w-[58%] sm:-left-6 sm:block" : "left-0 w-[92%] sm:w-[86%]"}`}>
        <ProductMockup compact />
      </div>
      <ScoreChip className={`absolute ${hasPhoto ? "!hidden sm:!flex -right-2 top-3 sm:-right-6" : "-right-2 top-24 sm:-right-6"}`} />
      <ValidatedChip className={`absolute ${hasPhoto ? "bottom-1 left-2 sm:bottom-3 sm:left-auto sm:right-4" : "bottom-4 right-0 sm:right-2"}`} />
    </div>
  );
}
