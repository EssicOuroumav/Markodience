import { describe, expect, it } from "vitest";
import { cleanUrl, hasBrandInfo, parseBrandInfoInput, readBrandInfo } from "./brandInfo";
import { dominantColor } from "./logoColor";

describe("adresses saisies", () => {
  it("ajoute https, retire la barre finale, accepte les @ et les numéros WhatsApp", () => {
    expect(cleanUrl("aicha-ong.org")).toBe("https://aicha-ong.org");
    expect(cleanUrl("https://www.facebook.com/aicha/")).toBe("https://www.facebook.com/aicha");
    expect(cleanUrl("@aicha.ci", "Instagram")).toBe("https://www.instagram.com/aicha.ci");
    expect(cleanUrl("@aicha", "TikTok")).toBe("https://www.tiktok.com/@aicha");
    expect(cleanUrl("+225 07 00 00 00 00", "WhatsApp")).toBe("https://wa.me/2250700000000");
    expect(cleanUrl("   ")).toBeNull();
  });
  it("refuse tout ce qui n'est pas une adresse web", () => {
    for (const bad of ["javascript:alert(1)", "data:text/html,<script>", "ftp://x.org/f", "monsite", "a b.org", "x".repeat(400), "@a b", "<script>"]) expect(cleanUrl(bad, "Instagram")).toBe("invalid");
    expect(cleanUrl("@aicha")).toBe("invalid"); // un @ n'a de sens que pour un réseau qui en utilise
  });
});

describe("formulaire de la fiche de marque", () => {
  const base = { website: "", socials: {}, links: [], about: "" };
  it("accepte une fiche vide", () => expect(parseBrandInfoInput(base)).toEqual({ ok: true, info: { website: null, socials: {}, links: [], about: null } }));
  it("normalise les champs remplis et ignore les lignes vides", () => {
    const r = parseBrandInfoInput({ website: "aicha.org", socials: { Facebook: "facebook.com/aicha", TikTok: "" }, links: [{ label: "", url: "" }, { label: "Dossier", url: "drive.google.com/x" }, { label: "", url: "docs.example.org/plan" }], about: " Une ONG. " });
    expect(r).toEqual({ ok: true, info: { website: "https://aicha.org", socials: { Facebook: "https://facebook.com/aicha" }, links: [{ label: "Dossier", url: "https://drive.google.com/x" }, { label: "docs.example.org", url: "https://docs.example.org/plan" }], about: "Une ONG." } });
  });
  it("signale la première erreur en français", () => {
    expect(parseBrandInfoInput({ ...base, website: "monsite" })).toMatchObject({ ok: false, error: expect.stringContaining("site web") });
    expect(parseBrandInfoInput({ ...base, socials: { Instagram: "javascript:x" } })).toMatchObject({ ok: false, error: expect.stringContaining("Instagram") });
    expect(parseBrandInfoInput({ ...base, links: [{ label: "Plan", url: "pas un lien" }] })).toMatchObject({ ok: false, error: expect.stringContaining("Plan") });
    expect(parseBrandInfoInput({ ...base, links: Array.from({ length: 9 }, (_, i) => ({ label: `l${i}`, url: "a.org" })) })).toMatchObject({ ok: false });
    expect(parseBrandInfoInput({ ...base, about: "x".repeat(801) })).toMatchObject({ ok: false });
  });
  it("relit les valeurs stockées sans jamais renvoyer un lien dangereux", () => {
    const i = readBrandInfo({ website: "javascript:alert(1)", socials: { Facebook: "https://facebook.com/a", TikTok: "javascript:x", X: 3 }, links: [{ label: "ok", url: "https://a.org" }, { label: "mal", url: "data:x" }, "n'importe quoi"], about: "Salut" });
    expect(i).toEqual({ website: null, socials: { Facebook: "https://facebook.com/a" }, links: [{ label: "ok", url: "https://a.org" }], about: "Salut" });
    expect(readBrandInfo({})).toEqual({ website: null, socials: {}, links: [], about: null });
    expect(hasBrandInfo(readBrandInfo({}))).toBe(false);
    expect(hasBrandInfo(i)).toBe(true);
  });
});

describe("couleur du logo", () => {
  const px = (rgba: number[][]) => Uint8ClampedArray.from(rgba.flat());
  const many = (c: number[], n: number) => Array.from({ length: n }, () => c);
  it("prend la teinte colorée la plus présente et ignore blanc, gris, noir et transparent", () => {
    const data = px([...many([255, 255, 255, 255], 500), ...many([30, 30, 30, 255], 300), ...many([120, 120, 120, 255], 200), ...many([5, 200, 5, 0], 400), ...many([14, 107, 59, 255], 120), ...many([201, 162, 39, 255], 40)]);
    expect(dominantColor(data)).toBe("#0E6B3B");
  });
  it("renvoie null pour un logo sans couleur marquée", () => {
    expect(dominantColor(px([...many([255, 255, 255, 255], 50), ...many([0, 0, 0, 255], 50), ...many([128, 128, 128, 255], 50)]))).toBeNull();
    expect(dominantColor([])).toBeNull();
  });
});
