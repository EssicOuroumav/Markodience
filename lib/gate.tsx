import UpsellCard from "@/components/UpsellCard";
import { hasFeature, type Feature, type PlanId } from "@/lib/plans";
import { TABS } from "@/lib/tabs";

/** Renvoie la carte d'upsell si l'onglet n'est pas inclus dans le plan, sinon null. */
export function lockedView(plan: PlanId, feature: Feature) {
  if (hasFeature(plan, feature)) return null;
  const tab = TABS.find((t) => t.feature === feature);
  return <UpsellCard title={tab?.label ?? "Fonctionnalité"} pitch={tab?.pitch ?? ""} />;
}
