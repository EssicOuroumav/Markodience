/**
 * Quand une étape change d'état (génération, premier enregistrement…), le navigateur le signale : le guide et la barre
 * latérale se rechargent (voir components/ProgressRefresher.tsx). Sans effet côté serveur.
 */
export const PROGRESS_EVENT = "markodience:progress";

/**
 * Pendant la construction du plan (plusieurs minutes, une dizaine de générations), recharger le tableau de bord à chaque étape terminée est inutile
 * et dangereux : les requêtes de rechargement se bousculent avec le parcours, et un rechargement complet de la page détruit le programme qui enchaîne
 * les étapes (le plan s'arrêtait après l'identité et l'écran de départ revenait). Le rechargement se fait une seule fois, à la fin.
 */
let paused = false;
export const pauseProgress = (v: boolean) => { paused = v; };
export const progressPaused = () => paused;
export const notifyProgress = () => {
  if (typeof window !== "undefined" && !paused) window.dispatchEvent(new Event(PROGRESS_EVENT));
};
