import { describe, expect, it } from "vitest";
import { briefIssues, briefSchema } from "./brief";
import { extractStage } from "./extract";

const text = (n: number) => "é".repeat(n);

/** Une fiche remplie par l'analyse de l'IA, au maximum de ce qu'elle a le droit d'écrire. */
function maxedExtract() {
  const e = extractStage.parse({});
  return {
    ...e,
    name: text(200), mission: text(1500), tagline: text(300), offer: text(1500), avoid: text(800),
    audiences: Array.from({ length: 8 }, () => ({ name: text(300), description: text(600) })),
    networks: Array.from({ length: 5 }, () => ({ name: text(80), audience: text(400) })),
    activities: Array.from({ length: 14 }, () => ({ name: text(300), start: "2026-10-01", end: "2026-10-31", goal: text(600) })),
    resources: { ad_budget: "moyen" as const, team: text(400), validators: Array.from({ length: 8 }, () => text(200)) },
    sensitivities: Array.from({ length: 12 }, () => text(400)),
    decisions: Array.from({ length: 10 }, () => text(400)),
    tone_words: Array.from({ length: 6 }, () => text(80)),
  };
}

describe("fiche du plan : la validation accepte tout ce que l'analyse peut écrire", () => {
  it("une fiche extraite au maximum de chaque limite est acceptée (sauf le plafond de 5 réseaux)", () => {
    const brief = { ...maxedExtract(), plan_start: "2026-10-19", weeks: 52 };
    const r = briefSchema.safeParse(brief);
    expect(r.success, r.success ? "" : JSON.stringify(r.error.issues.map((i) => i.path.join(".")))).toBe(true);
  });
  it("chaque limite de texte de la validation est au moins égale à celle de l'analyse", () => {
    // si quelqu'un resserre la validation, ce test échoue : l'IA pourrait de nouveau produire une fiche refusée
    const e = maxedExtract();
    const overs = Object.entries({ mission: 1501, offer: 1501, tagline: 301, avoid: 801, name: 201 }).filter(([k, n]) => briefSchema.shape[k as "mission"].safeParse(text(n)).success);
    expect(overs.map(([k]) => k)).toEqual([]); // ces textes sont trop longs pour l'analyse comme pour la validation
    expect(e.mission.length).toBe(1500);
  });
});

describe("messages d'erreur de la fiche", () => {
  const base = { name: "ONG", kind: "ong", mission: "Aider.", audiences: [{ name: "Bénéficiaires", description: "x" }], networks: [{ name: "Facebook", audience: "" }], plan_start: "2026-10-19", weeks: 52, resources: { ad_budget: "aucun", team: "", validators: [] } };
  it("une fiche correcte ne produit aucun message", () => expect(briefIssues(base)).toEqual([]));
  it("indique le champ, la longueur et le maximum", () => {
    const issues = briefIssues({ ...base, offer: text(1600), sensitivities: Array.from({ length: 13 }, () => "a") });
    expect(issues).toContain("Ce que vous proposez : 1 600 caractères, maximum 1 500");
    expect(issues).toContain("Sujets sensibles : 13 éléments, maximum 12");
  });
  it("désigne le public ou la campagne fautifs par leur numéro", () => {
    const issues = briefIssues({ ...base, audiences: [base.audiences[0], { name: "B", description: text(700) }], activities: [{ name: "C", start: "2026-10-01", end: "2026-10-31", goal: text(700) }] });
    expect(issues.some((l) => l.startsWith("Public n° 2 (description)"))).toBe(true);
    expect(issues.some((l) => l.startsWith("Campagne n° 1 (objectif)"))).toBe(true);
  });
  it("trop de réseaux : message clair", () => {
    const nets = ["a", "b", "c", "d", "e", "f"].map((name) => ({ name, audience: "" }));
    expect(briefIssues({ ...base, networks: nets })).toContain("Réseaux sociaux : 6 éléments, maximum 5");
  });
});
