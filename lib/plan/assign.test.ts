import { describe, expect, it } from "vitest";
import { assignPillars, ALLOWED } from "./assign";
import { buildWeeks } from "./calendar";
import type { Role } from "./schemas";

const pillars = [
  { title: "Preuves", pct: 30, role: "preuve" as Role },
  { title: "Transparence", pct: 20, role: "transparence" as Role },
  { title: "Appels", pct: 15, role: "appel" as Role },
  { title: "Voix", pct: 15, role: "voix" as Role },
  { title: "Santé", pct: 12, role: "pedagogie" as Role },
  { title: "Communauté", pct: 8, role: "communaute" as Role },
];
const acts = [
  { name: "A", start: "2026-08-10", end: "2026-09-06", goal: "" },
  { name: "B", start: "2026-10-05", end: "2026-11-01", goal: "" },
  { name: "C", start: "2026-11-09", end: "2026-11-22", goal: "" },
  { name: "D", start: "2027-01-18", end: "2027-02-21", goal: "" },
  { name: "E", start: "2027-04-19", end: "2027-05-15", goal: "" },
];

describe("attribution des piliers par le code", () => {
  const phases = buildWeeks("2026-08-03", 52, acts).map((w) => w.phase);
  const out = assignPillars(phases, pillars);
  it("donne un pilier à chaque semaine, parmi ceux définis", () => {
    expect(out).toHaveLength(52);
    expect(out.every((t) => pillars.some((p) => p.title === t))).toBe(true);
  });
  it("respecte les pourcentages à 8 points près (≈ 4 semaines)", () => {
    for (const p of pillars) {
      const share = (out.filter((t) => t === p.title).length / 52) * 100;
      expect(Math.abs(share - p.pct)).toBeLessThanOrEqual(8);
    }
  });
  it("place chaque pilier dans une phase compatible avec son rôle (sauf manque de choix)", () => {
    out.forEach((title, i) => {
      const role = pillars.find((p) => p.title === title)!.role;
      const hasChoice = pillars.some((p) => ALLOWED[phases[i]].includes(p.role));
      if (hasChoice) expect(ALLOWED[phases[i]]).toContain(role);
    });
  });
  it("évite presque toujours deux semaines de suite sur le même pilier", () => {
    const repeats = out.filter((t, i) => i > 0 && t === out[i - 1]).length;
    expect(repeats).toBeLessThanOrEqual(3);
  });
  it("fonctionne avec un seul pilier et sans activité", () => {
    expect(assignPillars(["evergreen", "evergreen"], [{ title: "Seul", pct: 100, role: "preuve" }])).toEqual(["Seul", "Seul"]);
    expect(assignPillars(["avant"], [{ title: "X", pct: 50, role: "voix" }, { title: "Y", pct: 50, role: "preuve" }])).toHaveLength(1); // aucun rôle compatible : retombe sur tous
  });
});
