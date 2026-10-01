import { describe, expect, it } from "vitest";
import { storageName, validateFile } from "./audit";

describe("validateFile", () => {
  it("accepte png, jpg, pdf", () => {
    for (const type of ["image/png", "image/jpeg", "application/pdf"]) expect(validateFile({ type, size: 1000 })).toBeNull();
  });
  it("refuse les autres formats", () => {
    expect(validateFile({ type: "text/html", size: 10 })).not.toBeNull();
    expect(validateFile({ type: "image/svg+xml", size: 10 })).not.toBeNull();
  });
  it("refuse > 10 Mo et fichier vide", () => {
    expect(validateFile({ type: "image/png", size: 10 * 1024 * 1024 + 1 })).not.toBeNull();
    expect(validateFile({ type: "image/png", size: 0 })).not.toBeNull();
  });
});

describe("storageName", () => {
  it("neutralise les chemins et accents", () => {
    expect(storageName(0, "../../évil/Capture écran.png", "image/png")).toBe("1-evil-Capture-ecran.png");
  });
  it("l'extension vient du type MIME", () => {
    expect(storageName(2, "x.exe", "application/pdf")).toBe("3-x.pdf");
  });
  it("nom vide", () => expect(storageName(0, "...", "image/jpeg")).toBe("1-fichier.jpg"));
});
