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

import { AUDIT_NETWORKS, MAX_FILES, MAX_TOTAL_BYTES, isAuditNetwork, validateTotal } from "./audit";
import { generateRequest } from "./ai/schemas";

describe("audit par réseau", () => {
  const base = { type: "audit", brand_profile_id: "11111111-1111-4111-8111-111111111111", audit_id: "22222222-2222-4222-8222-222222222222" };
  it("jusqu'à 8 fichiers et 20 Mo au total", () => {
    expect(MAX_FILES).toBe(8);
    expect(validateTotal([MAX_TOTAL_BYTES])).toBeNull();
    expect(validateTotal([MAX_TOTAL_BYTES, 1])).not.toBeNull();
    expect(validateTotal([5e6, 5e6, 5e6, 6e6])).not.toBeNull();
    expect(validateTotal([])).toBeNull();
  });
  it("réseaux reconnus", () => {
    for (const n of AUDIT_NETWORKS) expect(isAuditNetwork(n)).toBe(true);
    expect(isAuditNetwork("MySpace")).toBe(false);
    expect(isAuditNetwork(undefined)).toBe(false);
  });
  it("la requête accepte 8 fichiers, refuse 9, impose un réseau connu (« Autre » par défaut)", () => {
    const files = (n: number) => Array.from({ length: n }, (_, i) => `b/a/${i}.png`);
    expect(generateRequest.safeParse({ ...base, files: files(8), network: "Facebook" }).success).toBe(true);
    expect(generateRequest.safeParse({ ...base, files: files(9), network: "Facebook" }).success).toBe(false);
    expect(generateRequest.safeParse({ ...base, files: files(1), network: "MySpace" }).success).toBe(false);
    const r = generateRequest.safeParse({ ...base, files: files(1) });
    expect(r.success && r.data.type === "audit" && r.data.network).toBe("Autre");
    expect(generateRequest.safeParse({ ...base, files: [], network: "Facebook" }).success).toBe(false);
  });
});
