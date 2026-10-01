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

import { readFileSync } from "node:fs";
describe("pages publiques du proxy", () => {
  const src = readFileSync("lib/supabase/middleware.ts", "utf8");
  it("les pages légales, robots, plan du site et image de partage sont accessibles sans connexion", () => {
    for (const p of ["/cgu", "/confidentialite", "/mentions-legales", "/forgot-password", "/robots.txt", "/sitemap.xml", "/opengraph-image"]) expect(src).toContain(p);
  });
  it("le tableau de bord et l'admin ne sont jamais publics", () => {
    const list = src.slice(src.indexOf("PUBLIC_PATHS = ["), src.indexOf("];"));
    expect(list).not.toContain("/dashboard");
    expect(list).not.toContain("/admin");
  });
});
