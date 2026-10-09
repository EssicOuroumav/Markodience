import { describe, expect, it } from "vitest";
import { METRIC_INFO, normalizeObjectives, objectiveProgress } from "./objectives";

const now = new Date(2026, 9, 15);
const rep = (month: string, data: Record<string, number>) => ({ month, data });

describe("normalizeObjectives", () => {
  it("accepte les anciens objectifs en texte simple", () => {
    expect(normalizeObjectives(["Gagner des abonnés", "  "], now)).toEqual([{ text: "Gagner des abonnés" }]);
  });
  it("garde une mesure complète et date un indicateur cumulatif du mois courant", () => {
    expect(normalizeObjectives([{ text: "A", metric: "new_followers", target: 1000 }], now)).toEqual([{ text: "A", metric: "new_followers", target: 1000, since: "2026-10-01" }]);
    expect(normalizeObjectives([{ text: "B", metric: "reach", target: 50000 }], now)).toEqual([{ text: "B", metric: "reach", target: 50000 }]);
  });
  it("retire une mesure incomplète ou invalide", () => {
    expect(normalizeObjectives([{ text: "C", metric: "reach" }, { text: "D", target: 5 }, { text: "E", metric: "inconnu", target: 5 }], now)).toEqual([{ text: "C" }, { text: "D" }]);
  });
  it("ignore ce qui n'est pas une liste ou un objectif valide", () => {
    expect(normalizeObjectives(null)).toEqual([]);
    expect(normalizeObjectives([42, { rien: 1 }, { text: "ok" }], now)).toEqual([{ text: "ok" }]);
  });
  it("les indicateurs proposés correspondent aux champs du suivi mensuel", () => {
    expect(Object.keys(METRIC_INFO).sort()).toEqual(["engagement", "new_followers", "posts_done", "reach"]);
  });
});

describe("objectiveProgress", () => {
  const reports = [rep("2026-08-01", { reach: 20000, new_followers: 100 }), rep("2026-09-01", { reach: 40000, new_followers: 250 }), rep("2026-10-01", { reach: 50000, new_followers: 150 })];
  it("indicateur mensuel : compare le dernier rapport à la cible", () => {
    expect(objectiveProgress({ text: "x", metric: "reach", target: 100000 }, reports)).toMatchObject({ current: 50000, percent: 50, reached: false, basis: "Dernier rapport : octobre 2026" });
  });
  it("indicateur cumulatif : additionne depuis la date de départ", () => {
    expect(objectiveProgress({ text: "x", metric: "new_followers", target: 1000, since: "2026-09-01" }, reports)).toMatchObject({ current: 400, percent: 40, basis: "Cumul depuis septembre 2026" });
  });
  it("plafonne le pourcentage à 100 et signale la cible atteinte", () => {
    expect(objectiveProgress({ text: "x", metric: "reach", target: 30000 }, reports)).toMatchObject({ current: 50000, percent: 100, reached: true });
  });
  it("null sans mesure, sans rapport utile ou avant la date de départ", () => {
    expect(objectiveProgress({ text: "x" }, reports)).toBeNull();
    expect(objectiveProgress({ text: "x", metric: "reach", target: 10 }, [])).toBeNull();
    expect(objectiveProgress({ text: "x", metric: "new_followers", target: 10, since: "2026-11-01" }, reports)).toBeNull();
    expect(objectiveProgress({ text: "x", metric: "posts_done", target: 10 }, reports)).toBeNull();
  });
  it("ignore les rapports sans valeur numérique", () => {
    expect(objectiveProgress({ text: "x", metric: "reach", target: 10 }, [{ month: "2026-10-01", data: { reach: "beaucoup" } }])).toBeNull();
  });
});

describe("explications des indicateurs", () => {
  it("chaque indicateur a une explication et un exemple chiffré", () => {
    for (const info of Object.values(METRIC_INFO)) {
      expect(info.help.length).toBeGreaterThan(30);
      expect(info.example).toMatch(/\d/);
    }
  });
});
