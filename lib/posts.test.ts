import { describe, expect, it } from "vitest";
import { addDays, groupByDate, hashtagsText, monthGrid, postCopyText, postsOutput, postsPerWeek, spreadDays, weekStartDate } from "./posts";
import { mockPosts } from "./ai/mock";

describe("publications", () => {
  it("calcule les dates de la semaine à partir du début de la période", () => {
    expect(weekStartDate("2026-10-05", 1)).toBe("2026-10-05");
    expect(weekStartDate("2026-10-05", 3)).toBe("2026-10-19");
    expect(addDays("2026-10-30", 3)).toBe("2026-11-02");
    expect(addDays("2026-12-30", 5)).toBe("2027-01-04");
  });
  it("lit la fréquence : 3 par défaut, entre 1 et 5", () => {
    expect(postsPerWeek("3 posts par semaine")).toBe(3);
    expect(postsPerWeek("2 par semaine")).toBe(2);
    expect(postsPerWeek("12 posts")).toBe(5);
    expect(postsPerWeek("0")).toBe(1);
    expect(postsPerWeek("quotidien")).toBe(3);
    expect(postsPerWeek(null)).toBe(3);
  });
  it("répartit les publications sur des jours différents", () => {
    for (let n = 1; n <= 5; n++) { const d = spreadDays(n); expect(d).toHaveLength(n); expect(new Set(d).size).toBe(n); expect(Math.max(...d)).toBeLessThanOrEqual(6); }
  });
  it("grille de mois : lundi en premier, toujours des semaines complètes", () => {
    const g = monthGrid(2026, 9); // octobre 2026 : le 1er est un jeudi
    expect(g[0][0].iso).toBe("2026-09-28");
    expect(g[0][3]).toEqual({ iso: "2026-10-01", inMonth: true });
    expect(g.every((w) => w.length === 7)).toBe(true);
    expect(g.flat().filter((c) => c.inMonth)).toHaveLength(31);
    expect(monthGrid(2026, 1).flat().filter((c) => c.inMonth)).toHaveLength(28);
  });
  it("regroupe par date et ignore les publications sans date", () => {
    const m = groupByDate([{ scheduled_date: "2026-10-05" }, { scheduled_date: "2026-10-05" }, { scheduled_date: null }]);
    expect(m.get("2026-10-05")).toHaveLength(2);
    expect(m.size).toBe(1);
  });
  it("met en forme les hashtags et le texte à copier", () => {
    expect(hashtagsText(["#aide", "a b", "", "#"])).toBe("#aide #ab");
    expect(postCopyText({ caption: " Bonjour ", call_to_action: "", hashtags: "#a" })).toBe("Bonjour\n\n#a");
  });
  it("valide la réponse simulée et refuse un jour hors semaine", () => {
    expect(postsOutput.safeParse(mockPosts([0, 2, 4])).success).toBe(true);
    expect(postsOutput.safeParse({ posts: [{ day_offset: 9, caption: "x" }] }).success).toBe(false);
    expect(postsOutput.safeParse({ posts: [] }).success).toBe(false);
  });
});
