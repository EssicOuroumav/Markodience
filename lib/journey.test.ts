import { describe, expect, it } from "vitest";
import { JOURNEY_ORDER, journeyComplete, journeyPosition, journeySteps, journeyVisible, lockedStepCount } from "./journey";
import { TABS } from "./tabs";

const none = {};
const all = Object.fromEntries(JOURNEY_ORDER.map((s) => [s, true]));

describe("parcours guidé", () => {
  it("l'ordre suit les dépendances : identité, piliers, tonalité avant l'audit, KPI en dernier", () => {
    expect(JOURNEY_ORDER).toEqual(["identity", "pillars", "tone", "audit", "editorial", "rules", "lives", "kpi"]);
    expect(JOURNEY_ORDER.indexOf("pillars")).toBeLessThan(JOURNEY_ORDER.indexOf("editorial"));
    expect(JOURNEY_ORDER.indexOf("tone")).toBeLessThan(JOURNEY_ORDER.indexOf("audit"));
  });
  it("chaque onglet existe et chaque onglet est dans le parcours", () => {
    expect([...JOURNEY_ORDER].sort()).toEqual(TABS.map((t) => t.slug).sort());
  });
  it("le palier gratuit n'a que les trois premières étapes ; Pro et Agence les huit", () => {
    expect(journeySteps("gratuit", none).map((s) => s.slug)).toEqual(["identity", "pillars", "tone"]);
    expect(journeySteps("pro", none)).toHaveLength(8);
    expect(journeySteps("agence", none)).toHaveLength(8);
    expect(lockedStepCount("gratuit")).toBe(5);
    expect(lockedStepCount("pro")).toBe(0);
  });
  it("position : étape courante, suivante, dernière", () => {
    const steps = journeySteps("pro", none);
    expect(journeyPosition(steps, "identity")).toMatchObject({ index: 0, total: 8, isLast: false, next: { slug: "pillars" } });
    expect(journeyPosition(steps, "kpi")).toMatchObject({ index: 7, isLast: true, next: null });
    expect(journeyPosition(steps, "account")).toBeNull();
    expect(journeyPosition(steps, null)).toBeNull();
  });
  it("une étape ignorée par le palier ne bloque pas la suite", () => {
    const steps = journeySteps("gratuit", none);
    expect(journeyPosition(steps, "tone")?.isLast).toBe(true);
    expect(journeyPosition(steps, "audit")).toBeNull();
  });
  it("complet quand toutes les étapes du palier sont faites", () => {
    expect(journeyComplete(journeySteps("pro", none))).toBe(false);
    expect(journeyComplete(journeySteps("pro", all))).toBe(true);
    expect(journeyComplete(journeySteps("gratuit", { identity: true, pillars: true, tone: true }))).toBe(true);
    expect(journeyComplete([])).toBe(false);
  });
  it("visible tant que la marque n'est pas terminée ni fermée pour cette marque", () => {
    const steps = journeySteps("pro", none);
    expect(journeyVisible(steps, undefined, "b1")).toBe(true);
    expect(journeyVisible(steps, ["b2"], "b1")).toBe(true);
    expect(journeyVisible(steps, ["b1"], "b1")).toBe(false);
    expect(journeyVisible(journeySteps("pro", all), [], "b1")).toBe(false);
  });
});
