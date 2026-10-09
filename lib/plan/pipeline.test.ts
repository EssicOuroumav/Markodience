import { describe, expect, it } from "vitest";
import { normalizePillars, rowsFor } from "./pipeline";
import { briefSchema } from "./brief";

describe("assemblage du plan", () => {
  it("ramène les pourcentages à 100", () => {
    const mk = (pcts: number[]) => ({ pillars: pcts.map((pct, i) => ({ title: `P${i}`, pct, purpose: "x", formats: "y" })) });
    for (const pcts of [[30, 20, 15, 15, 12, 8], [40, 30, 20, 20], [25, 25, 25, 20], [10, 10, 10, 10]]) {
      const n = normalizePillars(mk(pcts));
      expect(n.pillars.reduce((s, p) => s + p.pct, 0)).toBe(100);
      expect(n.pillars.every((p) => p.pct >= 3)).toBe(true);
    }
    expect(normalizePillars(mk([50, 30, 20, 0 + 5])).pillars.reduce((s, p) => s + p.pct, 0)).toBe(100);
  });
  it("injecte le thème de la semaine dans les modèles de la phase", () => {
    const row = { day: "Lundi", pillar: "Preuves", format: "Album", idea: "Reportage : {theme}. Premiers chiffres.", hook: "{theme} : on y est." };
    const templates = { network: "Facebook", avant: [row], pendant: [row], apres: [row], evergreen: [row] };
    const [r] = rowsFor({ phase: "pendant", theme: "Distribution des kits scolaires." }, templates);
    expect(r.idea).toBe("Reportage : distribution des kits scolaires. Premiers chiffres.");
    expect(r.hook).toBe("Distribution des kits scolaires : on y est.");
  });
  it("valide un cahier des charges et refuse des dates invalides", () => {
    const base = { name: "X", kind: "ong", mission: "m", audiences: [{ name: "a" }], networks: [{ name: "Facebook" }], resources: {}, plan_start: "2026-08-03" };
    expect(briefSchema.safeParse(base).success).toBe(true);
    expect(briefSchema.safeParse({ ...base, plan_start: "03/08/2026" }).success).toBe(false);
    expect(briefSchema.safeParse({ ...base, activities: [{ name: "c", start: "demain", end: "2026-09-01" }] }).success).toBe(false);
  });
});
