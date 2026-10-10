import { hasFeature, type PlanId } from "./plans";
import { TABS, type TabSlug } from "./tabs";

/**
 * Parcours guidé d'une nouvelle marque. L'ordre suit les dépendances : l'audit juge les visuels à la lumière de
 * l'identité, des piliers et de la tonalité ; la ligne éditoriale exige les piliers ; les KPI sont un suivi mensuel, donc en dernier.
 */
export const JOURNEY_ORDER: readonly TabSlug[] = ["identity", "personas", "charter", "pillars", "tone", "audit", "editorial", "posts", "rules", "lives", "kpi"];

export type JourneyStep = { slug: TabSlug; label: string; done: boolean };

/** Étapes accessibles avec le palier (un palier limité a un parcours plus court), dans l'ordre du parcours. */
export function journeySteps(plan: PlanId, done: Partial<Record<TabSlug, boolean>>): JourneyStep[] {
  return JOURNEY_ORDER.flatMap((slug) => {
    const tab = TABS.find((t) => t.slug === slug);
    return tab && hasFeature(plan, tab.feature) ? [{ slug, label: tab.label, done: !!done[slug] }] : [];
  });
}

/** Nombre d'étapes du parcours réservées à un palier supérieur. */
export const lockedStepCount = (plan: PlanId) => JOURNEY_ORDER.length - journeySteps(plan, {}).length;

export const journeyComplete = (steps: JourneyStep[]) => steps.length > 0 && steps.every((s) => s.done);

export type JourneyPosition = { index: number; total: number; current: JourneyStep; next: JourneyStep | null; isLast: boolean };

/** Où se situe l'onglet courant dans le parcours ; null si l'onglet n'est pas une étape (vue d'ensemble, compte…). */
export function journeyPosition(steps: JourneyStep[], slug: string | null): JourneyPosition | null {
  const index = steps.findIndex((s) => s.slug === slug);
  if (index === -1) return null;
  return { index, total: steps.length, current: steps[index], next: steps[index + 1] ?? null, isLast: index === steps.length - 1 };
}

/** Le guide se masque une fois la marque terminée ou quand l'utilisateur l'a fermé pour cette marque. */
export const journeyVisible = (steps: JourneyStep[], dismissed: string[] | undefined, brandId: string) =>
  steps.length > 0 && !journeyComplete(steps) && !(dismissed ?? []).includes(brandId);
