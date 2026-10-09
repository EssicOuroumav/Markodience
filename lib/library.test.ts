import { describe, expect, it } from "vitest";
import { assetPath, displayName, guessCategory, totalBytes, validateAssetFile, LIBRARY_MAX_FILE_BYTES } from "./library";

describe("bibliothèque", () => {
  it("valide le format et le poids", () => {
    expect(validateAssetFile({ type: "image/png", size: 1000 })).toBeNull();
    expect(validateAssetFile({ type: "application/pdf", size: LIBRARY_MAX_FILE_BYTES })).toBeNull();
    expect(validateAssetFile({ type: "image/svg+xml", size: 10 })).toContain("Format");
    expect(validateAssetFile({ type: "video/mp4", size: 10 })).toContain("Format");
    expect(validateAssetFile({ type: "image/jpeg", size: LIBRARY_MAX_FILE_BYTES + 1 })).toContain("volumineux");
    expect(validateAssetFile({ type: "image/jpeg", size: 0 })).toContain("vide");
  });
  it("génère le chemin sans reprendre le nom du fichier", () => {
    expect(assetPath("brand-1", "abc", "image/webp")).toBe("brand-1/abc.webp");
    expect(assetPath("b", "i", "application/pdf")).toBe("b/i.pdf");
  });
  it("propose un nom et une catégorie", () => {
    expect(displayName("logo_ONG_final.png")).toBe("logo ONG final");
    expect(displayName(".png")).toBe("Fichier");
    expect(guessCategory("application/pdf")).toBe("document");
    expect(guessCategory("image/png")).toBe("photo");
  });
  it("additionne les poids", () => expect(totalBytes([{ size_bytes: 5 }, { size_bytes: 7 }])).toBe(12));
});
