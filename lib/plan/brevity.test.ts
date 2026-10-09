import { describe, expect, it } from "vitest";
import { applyRewrites, collectOver, wordCount } from "./brevity";

describe("concision imposée", () => {
  const rules = { rules: [{ title: "Court", text: "un deux trois" }, { title: "Titre beaucoup trop long pour une règle simple", text: Array(40).fill("mot").join(" ") }] };
  it("repère uniquement les textes trop longs, avec leur chemin", () => {
    const over = collectOver("rules", rules);
    expect(over.map((o) => o.path)).toEqual(["rules[1].title", "rules[1].text"]);
    expect(over.map((o) => o.max)).toEqual([7, 24]);
  });
  it("applique les réécritures sans toucher l'original, ignore celles qui rallongent", () => {
    const over = collectOver("rules", rules);
    const out = applyRewrites(rules, over, ["Titre court", Array(60).fill("x").join(" ")]);
    expect(out.rules[1].title).toBe("Titre court");
    expect(out.rules[1].text).toBe(rules.rules[1].text); // réécriture plus longue : refusée
    expect(rules.rules[1].title).toContain("beaucoup"); // l'original est intact
  });
  it("traverse les objets imbriqués et les listes de listes", () => {
    const kpi = { intro: "ok", rows: [{ indicator: "i", by_network: [{ network: "F", target: Array(20).fill("a").join(" ") }], cadence: "c" }], cadences: [] };
    expect(collectOver("kpi", kpi).map((o) => o.path)).toEqual(["rows[0].by_network[0].target"]);
    const tpl = { network: "F", avant: [{ idea: Array(30).fill("a").join(" "), hook: "h" }], pendant: [], apres: [], evergreen: [] };
    expect(collectOver("templates", tpl)[0].path).toBe("avant[0].idea");
  });
  it("compte les mots", () => {
    expect(wordCount("  un  deux\ntrois ")).toBe(3);
    expect(wordCount("")).toBe(0);
  });
});
