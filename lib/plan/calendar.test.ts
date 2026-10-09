import { describe, expect, it } from "vitest";
import { factsBetween } from "./facts";
import { buildWeeks, groupMonths, mondayOnOrAfter, phaseOf } from "./calendar";

const acts = [
  { name: "Rentrée", start: "2026-08-10", end: "2026-09-06", goal: "" },
  { name: "Octobre Rose", start: "2026-10-05", end: "2026-10-25", goal: "" },
];

describe("faits du calendrier", () => {
  it("calcule les fêtes mobiles 2027 (calendrier Umm al-Qura)", () => {
    const f = factsBetween("2026-08-01", "2027-07-31");
    const get = (label: string) => f.find((x) => x.label.startsWith(label));
    expect(get("Ramadan")?.date).toBe("2027-02-08");
    expect(get("Ramadan")?.end).toBe("2027-03-08");
    expect(get("Aïd el-Fitr")?.date).toBe("2027-03-09");
    expect(get("Tabaski")?.date).toBe("2027-05-16");
    expect(get("Ramadan")?.approx).toBe(true);
  });
  it("dates fixes : Octobre Rose couvre le mois, jours fériés ivoiriens seulement pour la Côte d'Ivoire", () => {
    const f = factsBetween("2026-10-01", "2026-12-31");
    expect(f.find((x) => x.label.startsWith("Octobre Rose"))).toMatchObject({ date: "2026-10-01", end: "2026-10-31" });
    expect(f.some((x) => x.label.includes("Houphouët"))).toBe(true);
    expect(factsBetween("2026-12-01", "2026-12-31", "Sénégal").some((x) => x.label.includes("Houphouët"))).toBe(false);
  });
  it("trie par date", () => {
    const f = factsBetween("2026-08-01", "2027-07-31");
    expect([...f].map((x) => x.date)).toEqual([...f].map((x) => x.date).sort());
  });
});

describe("phases du calendrier", () => {
  it("premier lundi", () => {
    expect(mondayOnOrAfter("2026-08-03")).toBe("2026-08-03");
    expect(mondayOnOrAfter("2026-08-04")).toBe("2026-08-10");
    expect(mondayOnOrAfter("2026-08-09")).toBe("2026-08-10");
  });
  it("pendant, bilan juste après, teasing avant, sinon permanent", () => {
    expect(phaseOf("2026-08-10", "2026-08-16", acts)).toEqual({ phase: "pendant", campaign: "Rentrée" });
    expect(phaseOf("2026-09-07", "2026-09-13", acts)).toEqual({ phase: "apres", campaign: "Rentrée" });
    expect(phaseOf("2026-09-14", "2026-09-20", acts)).toEqual({ phase: "apres", campaign: "Rentrée" }); // 14 jours après la fin
    expect(phaseOf("2026-09-21", "2026-09-27", acts)).toEqual({ phase: "avant", campaign: "Octobre Rose" }); // 21 jours avant le début
    expect(phaseOf("2026-09-14", "2026-09-20", [])).toEqual({ phase: "evergreen", campaign: null });
    expect(phaseOf("2026-11-09", "2026-11-15", acts)).toEqual({ phase: "evergreen", campaign: null });
  });
  it("construit 52 semaines contiguës rattachées au bon mois", () => {
    const w = buildWeeks("2026-08-03", 52, acts);
    expect(w).toHaveLength(52);
    expect(w[0].start).toBe("2026-08-03");
    expect(w[51].end).toBe("2027-08-01");
    for (let i = 1; i < w.length; i++) expect(Date.parse(w[i].start) - Date.parse(w[i - 1].start)).toBe(7 * 86_400_000);
    const months = groupMonths(w);
    expect(months[0].label).toBe("août 2026");
    expect(months.reduce((n, m) => n + m.weeks.length, 0)).toBe(52);
    expect(months.find((m) => m.label === "octobre 2026")?.context).toContain("Octobre Rose");
  });
});
