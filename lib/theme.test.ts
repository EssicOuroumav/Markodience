import { describe, expect, it } from "vitest";
import { DEFAULT_BRAND_COLOR, accentFrom, brandTheme, contrast, parseHex } from "./theme";

const WHITE: [number, number, number] = [255, 255, 255];

describe("parseHex", () => {
  it("accepte les couleurs valides", () => expect(parseHex("#059669")).toEqual([5, 150, 105]));
  it("rejette les valeurs invalides", () => {
    for (const v of [null, undefined, "", "vert", "#12", "#GGGGGG", "javascript:alert(1)"]) expect(parseHex(v)).toBeNull();
  });
});

describe("accentFrom", () => {
  it("garantit un contraste suffisant avec le texte blanc, même pour les couleurs claires", () => {
    for (const hex of ["#FFFF00", "#FDE68A", "#FFFFFF", "#00FFFF", "#059669", "#C2410C", "#1D1D1F", "#000000", "#0071E3"]) {
      expect(contrast(WHITE, accentFrom(hex))).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("conserve une couleur déjà lisible", () => expect(accentFrom("#047857")).toEqual([4, 120, 87]));
  it("assombrit légèrement un vert émeraude trop clair sans changer sa teinte", () => {
    const [r, g, b] = accentFrom("#059669");
    expect(g).toBeGreaterThan(r);
    expect(g).toBeGreaterThan(b);
    expect(contrast([255, 255, 255], [r, g, b])).toBeGreaterThanOrEqual(4.5);
  });
  it("retombe sur le bleu par défaut si la couleur est invalide", () => expect(accentFrom("nimporte quoi")).toEqual(accentFrom(DEFAULT_BRAND_COLOR)));
});

describe("brandTheme", () => {
  it("fournit toutes les variables attendues, sans injection possible", () => {
    const t = brandTheme("#047857");
    for (const k of ["--rgb-accent", "--rgb-accent-strong", "--rgb-accent-light", "--rgb-accent-soft", "--color-accent"]) expect(t[k]).toBeTruthy();
    expect(t["--rgb-accent"]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    expect(t["--color-accent"]).toMatch(/^#[0-9a-f]{6}$/);
    const hostile = brandTheme("red; background:url(//evil)");
    expect(hostile["--rgb-accent"]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
  });
  it("la teinte « soft » est plus claire que l'accent", () => {
    const t = brandTheme("#059669");
    const lum = (s: string) => s.split(" ").map(Number).reduce((a, b) => a + b, 0);
    expect(lum(t["--rgb-accent-soft"])).toBeGreaterThan(lum(t["--rgb-accent"]));
  });
});
