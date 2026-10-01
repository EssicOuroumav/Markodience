import { describe, expect, it } from "vitest";
import { FAQ, FAQ_COUNT, faqJsonLd } from "./faq";
import { PLANS } from "./plans";

const all = FAQ.flatMap((c) => c.items);

describe("FAQ", () => {
  it("chaque catégorie a au moins 4 questions", () => FAQ.forEach((c) => expect(c.items.length).toBeGreaterThanOrEqual(4)));
  it("questions en forme de question, réponses développées", () => {
    for (const i of all) {
      expect(i.q.trim().endsWith("?")).toBe(true);
      expect(i.a.length).toBeGreaterThan(80);
    }
  });
  it("pas de doublon de question", () => expect(new Set(all.map((i) => i.q)).size).toBe(FAQ_COUNT));
  it("les chiffres suivent la configuration des paliers", () => {
    const text = all.map((i) => i.a).join(" ");
    expect(text).toContain(String(PLANS.gratuit.aiDailyLimit));
    expect(text).toContain(String(PLANS.pro.aiDailyLimit));
    expect(text).toContain(String(PLANS.agence.aiDailyLimit));
    expect(text).toContain("12 000 XOF");
    expect(text).toContain("18 000 XOF");
    expect(text).toContain(String(PLANS.agence.maxProfiles));
  });
  it("aucune promesse non tenue", () => {
    const text = all.map((i) => i.a.toLowerCase()).join(" ");
    expect(text).not.toContain("illimité");
    expect(text).not.toContain("remboursé");
  });
  it("JSON-LD complet", () => expect(faqJsonLd().mainEntity).toHaveLength(FAQ_COUNT));
});
