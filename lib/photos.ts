/**
 * Photos de l'accueil. `null` = on affiche l'illustration de personnage correspondante.
 * Pour utiliser une vraie photo : déposer le fichier dans /public/photos/ puis renseigner son chemin ici.
 */
export const PHOTOS = {
  hero: "/photos/hero-bg.jpg" as string | null, // fond de l'en-tête, paysage 3:2 (1536 px)
  aspirant: null as string | null, // ex. "/photos/cm-2.jpg" (paysage 4:3)
  confirmed: null as string | null, // ex. "/photos/cm-3.jpg"
  team: null as string | null, // ex. "/photos/cm-4.jpg"
};
