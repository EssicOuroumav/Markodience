import { describe, expect, it } from "vitest";
import { ASSISTANT_TASKS, assistantOutput, mockAssistant } from "./schemas";
import { buildDocPdf, docFileName } from "../assistantPdf";

describe("assistant", () => {
  it("le mock de chaque tâche est valide", () => {
    for (const t of ASSISTANT_TASKS) expect(assistantOutput.safeParse(mockAssistant(t)).success).toBe(true);
  });
  it("refuse une réponse sans section", () => {
    expect(assistantOutput.safeParse({ title: "x", summary: "y", sections: [] }).success).toBe(false);
  });
  it("produit un PDF lisible, avec accents et guillemets typographiques", () => {
    const doc = buildDocPdf({ brandName: "ONG d'Aïcha", color: "#1f7a4d", kind: "Rapport", title: "« Bilan » d'octobre – chiffres", summary: "Résumé", sections: Array.from({ length: 12 }, (_, i) => ({ heading: `Section ${i}`, body: "Texte long. ".repeat(80) })), actions: ["Relancer"], watermark: true });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(doc.output("arraybuffer").byteLength).toBeGreaterThan(2000);
    expect(docFileName("ONG d'Aïcha", "Dossier stratégique")).toBe("Dossierstrategique_ONGdAicha.pdf");
  });
});
