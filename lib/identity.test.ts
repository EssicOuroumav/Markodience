import { describe, expect, it } from "vitest";
import { parseFoundations, parseVisualGuide, identityExtendOutput } from "./identity";
import { mockExtend } from "./ai/mock";
import { brandGuideFileName, buildBrandGuidePdf, pdfText } from "./brandGuidePdf";

describe("fondations et charte", () => {
  it("accepte la réponse simulée et rejette une forme invalide", () => {
    const m = mockExtend();
    expect(identityExtendOutput.safeParse(m).success).toBe(true);
    expect(parseFoundations(m.foundations)).not.toBeNull();
    expect(parseFoundations({ mission: "x" })).toBeNull();
    expect(parseVisualGuide(null)).toBeNull();
    expect(parseVisualGuide(m.visual_guide)?.logo_rules.length).toBeGreaterThan(0);
  });
});

describe("guide de marque PDF", () => {
  const m = mockExtend();
  it("nomme le fichier sans accents ni espaces", () => {
    expect(brandGuideFileName("ONG Aïcha & Co")).toBe("GuideDeMarque_ONGAichaCo.pdf");
    expect(brandGuideFileName("***")).toBe("GuideDeMarque_Marque.pdf");
  });
  it("remplace les caractères que Helvetica ne sait pas dessiner", () => {
    expect(pdfText("L’action… « ok » – 😀 ع").trim()).toBe("L'action... « ok » -");
  });
  it("produit un document complet (couverture + contenu) et tolère une identité ancienne", () => {
    const full = buildBrandGuidePdf({
      brandName: "Marque", color: "#0F6B4F", watermark: true,
      identity: { positioning: "Un positionnement.", target_segments: [{ name: "Public", description: "d", need: "n", barriers: "b" }], visual_palette: [{ color: "#0F6B4F", usage: "Principale" }], marketing_objectives: [{ text: "Objectif" }], ...m },
      pillars: [{ name: "Pilier", description: "d", examples: ["a", "b"] }],
      tone: { do_list: ["oui"], dont_list: ["non"] },
    });
    expect(full.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    const old = buildBrandGuidePdf({ brandName: "Marque", identity: { positioning: "P", visual_palette: [{ color: "#000000", usage: "u" }] } });
    expect(old.getNumberOfPages()).toBeGreaterThanOrEqual(2);
    expect(() => buildBrandGuidePdf({ brandName: "Vide", identity: null })).not.toThrow();
  });
});
