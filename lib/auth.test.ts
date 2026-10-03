import { describe, expect, it } from "vitest";
import { safeNext } from "./auth-redirect";
import { validatePassword } from "./password";

describe("safeNext", () => {
  it("accepte les destinations internes prévues", () => {
    expect(safeNext("/reset-password")).toBe("/reset-password");
    expect(safeNext("/dashboard")).toBe("/dashboard");
  });
  it("refuse toute autre destination (pas de redirection ouverte)", () => {
    for (const v of ["https://evil.com", "//evil.com", "/admin", "/dashboard/../admin", "javascript:alert(1)", "", null, undefined]) {
      expect(safeNext(v)).toBe("/dashboard");
    }
  });
});

describe("validatePassword", () => {
  it("accepte un mot de passe correct", () => expect(validatePassword("Marko2026x")).toBeNull());
  it("refuse trop court, sans chiffre, sans lettre, trop long", () => {
    expect(validatePassword("Ab1")).not.toBeNull();
    expect(validatePassword("abcdefghij")).not.toBeNull();
    expect(validatePassword("1234567890")).not.toBeNull();
    expect(validatePassword("a1".repeat(40))).not.toBeNull();
  });
});

import { PRIVATE_PREFIXES, PUBLIC_PATHS, isPublicPath, requiresSession } from "./paths";

describe("zones publiques et privées du proxy", () => {
  it("les pages légales, robots, plan du site et image de partage sont accessibles sans connexion", () => {
    for (const p of ["/cgu", "/confidentialite", "/mentions-legales", "/forgot-password", "/robots.txt", "/sitemap.xml", "/opengraph-image", "/login", "/signup"]) {
      expect(isPublicPath(p)).toBe(true);
      expect(requiresSession(p)).toBe(false);
    }
  });
  it("le tableau de bord, l'admin et la réinitialisation exigent une session", () => {
    for (const p of ["/dashboard", "/dashboard/account", "/dashboard/brands/abc", "/admin", "/admin/users", "/reset-password", "/payment/mock"]) expect(requiresSession(p)).toBe(true);
  });
  it("jamais publics : tableau de bord et admin", () => {
    expect(PUBLIC_PATHS.some((p) => p.startsWith("/dashboard") || p.startsWith("/admin"))).toBe(false);
    expect(PRIVATE_PREFIXES).toEqual(expect.arrayContaining(["/dashboard", "/admin"]));
  });
  it("l'API exige une session, sauf le webhook de paiement", () => {
    expect(requiresSession("/api/generate")).toBe(true);
    expect(requiresSession("/api/admin/action")).toBe(true);
    expect(requiresSession("/api/payments/webhook")).toBe(false);
  });
  it("le retour de paiement et le callback d'authentification restent publics", () => {
    expect(requiresSession("/payment/return")).toBe(false);
    expect(requiresSession("/auth/callback")).toBe(false);
  });
  it("une adresse inconnue n'est pas redirigée : elle reçoit la page 404", () => {
    expect(requiresSession("/page-inconnue")).toBe(false);
    expect(requiresSession("/dashboardx")).toBe(false);
  });
});
