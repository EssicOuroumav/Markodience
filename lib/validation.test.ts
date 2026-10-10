import { describe, expect, it } from "vitest";
import { createBody, decideBody, decisionError, expiryDate, hashToken, isTokenShape, newToken, requestState, shareUrl, statusAfter } from "./validation";
import { isPublicPath, requiresSession } from "./paths";
import { NEXT_STEP, POST_STATUSES, postTitle } from "./posts";

describe("jeton de validation", () => {
  it("est aléatoire, de la bonne forme, et seule son empreinte est comparable", () => {
    const a = newToken(), b = newToken();
    expect(a).not.toBe(b);
    expect(isTokenShape(a)).toBe(true);
    expect(hashToken(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashToken(a)).not.toContain(a);
    expect(hashToken(a)).toBe(hashToken(a));
    expect(hashToken(a)).not.toBe(hashToken(b));
  });
  it("refuse toute forme inattendue", () => {
    for (const bad of ["", "court", "x".repeat(44), "../etc/passwd", `${"a".repeat(42)}!`, null, undefined, 42]) expect(isTokenShape(bad)).toBe(false);
  });
  it("construit l'adresse de partage sans double barre", () => {
    expect(shareUrl("https://markodience.vercel.app/", "abc")).toBe("https://markodience.vercel.app/validation/abc");
  });
});

describe("état d'un lien", () => {
  const now = new Date("2026-10-10T10:00:00Z");
  it("valable, expiré, désactivé", () => {
    expect(requestState({ expires_at: expiryDate(7, now), revoked_at: null }, now)).toBe("ok");
    expect(requestState({ expires_at: "2026-10-09T10:00:00Z", revoked_at: null }, now)).toBe("expired");
    expect(requestState({ expires_at: expiryDate(7, now), revoked_at: "2026-10-10T09:00:00Z" }, now)).toBe("revoked");
    expect(requestState({ expires_at: "2026-10-10T10:00:00Z", revoked_at: null }, now)).toBe("expired"); // à l'instant près
  });
  it("calcule l'échéance en jours", () => expect(expiryDate(3, now)).toBe("2026-10-13T10:00:00.000Z"));
});

describe("demandes et décisions", () => {
  it("valide la création : publications, validateur, durée autorisée", () => {
    const id = "6f1c2b6e-8d1f-4e5c-9a43-2a5d6b7c8d90";
    expect(createBody.safeParse({ post_ids: [id], reviewer: " Direction ", days: 14 })).toMatchObject({ success: true, data: { reviewer: "Direction", note: "" } });
    expect(createBody.safeParse({ post_ids: [], reviewer: "x" }).success).toBe(false);
    expect(createBody.safeParse({ post_ids: [id], reviewer: "  " }).success).toBe(false);
    expect(createBody.safeParse({ post_ids: [id], reviewer: "x", days: 365 }).success).toBe(false);
    expect(createBody.safeParse({ post_ids: ["pas-un-uuid"], reviewer: "x" }).success).toBe(false);
    expect(createBody.safeParse({ post_ids: Array.from({ length: 41 }, () => id), reviewer: "x" }).success).toBe(false);
  });
  it("une demande de modification doit dire quoi modifier", () => {
    const base = { token: newToken(), post_id: "6f1c2b6e-8d1f-4e5c-9a43-2a5d6b7c8d90" };
    expect(decisionError(decideBody.parse({ ...base, decision: "approuve" }))).toBeNull();
    expect(decisionError(decideBody.parse({ ...base, decision: "modifs", comment: "  " }))).toContain("modifier");
    expect(decisionError(decideBody.parse({ ...base, decision: "modifs", comment: "Changer la photo" }))).toBeNull();
    expect(decideBody.safeParse({ ...base, token: "faux", decision: "approuve" }).success).toBe(false);
    expect(decideBody.safeParse({ ...base, decision: "supprimer" }).success).toBe(false);
  });
  it("approuvée : programmée ; modifications : retour en brouillon", () => {
    expect(statusAfter("approuve")).toBe("programme");
    expect(statusAfter("modifs")).toBe("brouillon");
  });
});

describe("circuit des statuts", () => {
  it("brouillon → à valider → programmé → publié, dans cet ordre", () => {
    expect(POST_STATUSES).toEqual(["brouillon", "a_valider", "programme", "publie"]);
    expect(NEXT_STEP.brouillon?.to).toBe("a_valider");
    expect(NEXT_STEP.a_valider?.to).toBe("programme");
    expect(NEXT_STEP.programme?.to).toBe("publie");
    expect(NEXT_STEP.publie).toBeUndefined();
  });
  it("titre court d'une publication", () => {
    expect(postTitle({ caption: "", hook: "", idea: "" })).toBe("Sans texte");
    expect(postTitle({ caption: "", hook: "Accroche", idea: "Idée" })).toBe("Accroche");
    expect(postTitle({ caption: "a ".repeat(100), hook: "", idea: "" }).length).toBeLessThanOrEqual(110);
  });
});

describe("accès public limité au lien de validation", () => {
  it("la page du validateur et sa décision sont publiques ; la création et la désactivation exigent une session", () => {
    expect(isPublicPath("/validation/abc")).toBe(true);
    expect(requiresSession("/validation/abc")).toBe(false);
    expect(requiresSession("/api/validation/decide")).toBe(false);
    expect(requiresSession("/api/validation/create")).toBe(true);
    expect(requiresSession("/api/validation/revoke")).toBe(true);
    expect(isPublicPath("/validation")).toBe(false);
  });
});
