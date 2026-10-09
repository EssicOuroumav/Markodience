import { hasFeature, type PlanId } from "./plans";

export const DEFAULT_FOOTER = "Markodience";
export const AGENCY_NAME_MAX = 60;

/** Nom d'agence saisi par l'utilisateur : texte simple, sans retour à la ligne ni espaces superflus. */
export const cleanAgencyName = (v: unknown): string => (typeof v === "string" ? v.replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ").trim().slice(0, AGENCY_NAME_MAX) : "");

/**
 * Nom affiché au pied des exports. Marque blanche (palier Agence) : le nom de l'agence, ou rien tant qu'il n'est pas renseigné
 * (jamais « Markodience »). Autres paliers : Markodience.
 */
export function footerBrand(plan: PlanId, metadata: Record<string, unknown> | undefined | null): string {
  return hasFeature(plan, "white_label") ? cleanAgencyName(metadata?.agency_name) : DEFAULT_FOOTER;
}
