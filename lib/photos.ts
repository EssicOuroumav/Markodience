/**
 * Photos de l'accueil. `null` = on affiche l'illustration de personnage correspondante.
 * Pour utiliser une vraie photo : déposer le fichier dans /public/photos/ puis renseigner son chemin ici.
 */
export const PHOTOS = {
  hero: "/photos/cm-1.jpg" as string | null, // paysage 3:2 (1400 px)
  aspirant: null as string | null, // ex. "/photos/cm-2.jpg" (paysage 4:3)
  confirmed: null as string | null, // ex. "/photos/cm-3.jpg"
  team: null as string | null, // ex. "/photos/cm-4.jpg"
};
