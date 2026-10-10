import { describe, expect, it } from "vitest";
import { cleanItems, communityOutput, mockCommunity, MAX_PER_KIND } from "./schemas";
import { kpiState, lastChange, parseNumber, progress } from "../performance";
import { auditSeries } from "../auditTrend";

describe("community", () => {
  it("le mock est valide et nettoyé", () => {
    const rows = cleanItems(communityOutput.parse(mockCommunity()));
    expect(rows.filter((r) => r.kind === "crise").map((r) => r.level)).toEqual(["faible", "moyen", "grave"]);
    expect(rows.every((r) => (r.kind === "crise") === (r.level !== null))).toBe(true);
  });
  it("plafonne et dédoublonne", () => {
    const items = Array.from({ length: 12 }, (_, i) => ({ kind: "faq" as const, title: i % 2 ? "Même" : `Q${i}`, situation: "", body: "r" }));
    const rows = cleanItems({ items: [...items, ...mockCommunity().items.slice(6)] });
    expect(rows.filter((r) => r.kind === "faq").length).toBeLessThanOrEqual(MAX_PER_KIND.faq);
    expect(rows.filter((r) => r.title === "Même").length).toBe(1);
  });
});

describe("performance", () => {
  const up = { baseline: 100, target: 200, alert_threshold: 80, direction: "hausse" as const };
  it("calcule l'état", () => {
    expect(kpiState(up, null)).toBe("sans_donnee");
    expect(kpiState(up, 200)).toBe("atteint");
    expect(kpiState(up, 160)).toBe("en_bonne_voie");
    expect(kpiState(up, 110)).toBe("en_retard");
    expect(kpiState(up, 70)).toBe("alerte");
  });
  it("gère les indicateurs à la baisse", () => {
    const down = { baseline: 10, target: 2, alert_threshold: 12, direction: "baisse" as const };
    expect(kpiState(down, 2)).toBe("atteint");
    expect(kpiState(down, 13)).toBe("alerte");
    expect(kpiState(down, 9)).toBe("en_retard");
    expect(progress(down, 6)).toBe(0.5);
  });
  it("lit les nombres à la française", () => {
    expect(parseNumber("1 200,5")).toBe(1200.5);
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("abc")).toBeUndefined();
    expect(parseNumber("99999999999")).toBeUndefined();
  });
  it("variation", () => {
    expect(lastChange([{ month: "2026-02-01", value: 5 }, { month: "2026-01-01", value: 2 }])).toBe(3);
    expect(lastChange([{ month: "2026-01-01", value: 2 }])).toBeNull();
  });
});

describe("audit", () => {
  it("groupe par réseau et calcule la variation", () => {
    const s = auditSeries([
      { id: "a", created_at: "2026-01-01", report_data: { score: 40, network: "Facebook" } },
      { id: "b", created_at: "2026-03-01", report_data: { score: 55, network: "Facebook" } },
      { id: "c", created_at: "2026-02-01", report_data: { score: 70 } },
      { id: "d", created_at: "2026-02-01", report_data: "x" },
    ]);
    expect(s[0]).toMatchObject({ network: "Facebook", delta: 15 });
    expect(s[1]).toMatchObject({ network: "Autre", delta: null });
  });
});
