/**
 * Quand une étape change d'état (génération, premier enregistrement…), le navigateur le signale : le guide et la barre
 * latérale se rechargent (voir components/ProgressRefresher.tsx). Sans effet côté serveur.
 */
export const PROGRESS_EVENT = "markodience:progress";
export const notifyProgress = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(PROGRESS_EVENT));
};
