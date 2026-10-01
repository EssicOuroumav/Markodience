import Photo from "./Photo";
import ProductMockup from "./ProductMockup";
import { PersonaHero } from "./people";
import { PHOTOS } from "@/lib/photos";

/** Visuel de l'en-tête : grande photo, avec la maquette du produit qui la chevauche. */
export default function HeroVisual() {
  return (
    <div className="relative mx-auto w-full max-w-[560px] pb-[8.5rem] sm:pb-36">
      <div className="relative ml-auto w-[88%] sm:w-[78%]">
        <div aria-hidden className="absolute -inset-4 -z-10 rounded-[44px] bg-gradient-to-br from-accent/25 via-accent/5 to-transparent blur-2xl" />
        <div className="aspect-[4/5] overflow-hidden rounded-[32px] shadow-pop ring-1 ring-black/5">
          {PHOTOS.hero ? (
            <Photo src={PHOTOS.hero} alt="Une community manager prépare ses contenus sur son ordinateur" priority sizes="(min-width: 1024px) 28vw, 70vw" className="h-full w-full" fallback={<PersonaHero className="h-full w-full" />} />
          ) : (
            <PersonaHero className="h-full w-full" />
          )}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 w-[92%] sm:w-[86%]">
        <ProductMockup compact />
      </div>
    </div>
  );
}
