import { describe, expect, it } from "vitest";
import { addMonths, nextStatus, periodRange, pillarRotation, weeksForPeriod } from "./editorial";

describe("période", () => {
  it("1 mois et 3 mois", () => {
    expect(periodRange("2026-10-01", 1)).toEqual({ period_start: "2026-10-01", period_end: "2026-10-31" });
    expect(periodRange("2026-10-01", 3)).toEqual({ period_start: "2026-10-01", period_end: "2026-12-31" });
  });
  it("gère les fins de mois", () => expect(addMonths("2026-01-31", 1)).toBe("2026-02-28"));
  it("nombre de semaines", () => {
    expect(weeksForPeriod(1)).toBe(4);
    expect(weeksForPeriod(3)).toBe(12);
  });
});

describe("rotation des piliers", () => {
  const names = ["A", "B", "C"];
  const plan = pillarRotation(names, 12);
  it("couvre toutes les semaines", () => expect(plan).toHaveLength(12));
  it("n'étire jamais un seul pilier", () => {
    expect(new Set(plan.map((p) => p.primary))).toEqual(new Set(names));
    expect(plan.slice(0, 3).map((p) => p.primary)).toEqual(["A", "B", "C"]);
  });
  it("fonctionne avec un seul pilier", () => expect(pillarRotation(["A"], 4).every((p) => p.primary === "A" && p.secondary === null)).toBe(true));
});

describe("statut", () => {
  it("cycle", () => {
    expect(nextStatus("a_venir")).toBe("en_cours");
    expect(nextStatus("termine")).toBe("a_venir");
  });
});
