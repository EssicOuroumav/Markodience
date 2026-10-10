import { describe, expect, it } from "vitest";
import { evaluatePillar, matchObjective, methodSteps, normalizePct, strategyChain } from "./evaluate";

describe("pourcentages et objectifs", () => {
  it("ramène le total à 100", () => {
    for (const pcts of [[30, 20, 15, 15, 12, 8], [40, 40, 40], [10, 10, 10], [50, 30, 20]]) {
      const out = normalizePct(pcts.map((pct) => ({ pct })));
      expect(out.reduce((n, p) => n + p.pct, 0)).toBe(100);
    }
    expect(normalizePct([])).toEqual([]);
  });
  it("rattache l'objectif de l'IA à celui de la marque, sans rien inventer", () => {
    const objs = ["Obtenir de nouveaux partenaires", "Collecter 100 contacts WhatsApp par mois"];
    expect(matchObjective("obtenir de NOUVEAUX partenaires", objs)).toBe(objs[0]);
    expect(matchObjective("Trouver des partenaires durables", objs)).toBe(objs[0]);
    expect(matchObjective("Tout autre sujet", objs)).toBe("Tout autre sujet");
    expect(matchObjective("X", [])).toBe("X");
  });
});

describe("test des 4 questions", () => {
  const ctx = { objectives: ["Obtenir des partenaires"], personaIds: new Set(["p1", "p2"]), ideaCount: 0 };
  it("un pilier complet est solide", () => {
    const r = evaluatePillar({ objective: "Obtenir des partenaires", persona_ids: ["p1"], subthemes: ["a", "b", "c"], kpi: "Rendez-vous obtenus" }, ctx);
    expect(r.passed).toBe(4);
    expect(r.verdict).toBe("solide");
  });
  it("signale chaque manque avec la marche à suivre", () => {
    const r = evaluatePillar({ objective: "Un autre objectif", persona_ids: ["inconnu"], subthemes: ["a"], kpi: "" }, ctx);
    expect(r.questions.map((q) => q.ok)).toEqual([false, false, false, false]);
    expect(r.verdict).toBe("a_retravailler");
    expect(r.questions[0].detail).toContain("n'est pas dans la liste");
    expect(r.questions[1].detail).toContain("Choisissez");
  });
  it("les idées comptent comme des contenus ; sans liste d'objectifs, un objectif renseigné suffit", () => {
    const r = evaluatePillar({ objective: "Notoriété", persona_ids: ["p2"], subthemes: [], kpi: "Portée" }, { objectives: [], personaIds: new Set(["p2"]), ideaCount: 4 });
    expect(r.passed).toBe(4);
    expect(evaluatePillar({ objective: "x", persona_ids: [], subthemes: [], kpi: null }, ctx).verdict).toBe("a_retravailler");
    expect(evaluatePillar({ objective: "Obtenir des partenaires", persona_ids: ["p1"], subthemes: ["a", "b", "c"], kpi: null }, ctx).verdict).toBe("a_ameliorer");
  });
});

describe("les 6 étapes", () => {
  const base = { hasIdentity: true, objectives: 2, personas: 3, diagnostic: { problem: "p", priority_objective: "o", hypotheses: ["h"] }, published: 0, planned: 0 };
  const full = { objective: "o", cta: "c", kpi: "k", subthemes: ["a", "b"] };
  it("une marque complète a franchi les cinq premières étapes", () => {
    const steps = methodSteps({ ...base, pillars: [full, full, full] });
    expect(steps.map((s) => s.done)).toEqual([true, true, true, true, true, false]);
    expect(steps[5].detail).toBe("Rien n'est encore publié.");
  });
  it("une marque neuve n'a rien de fait et chaque étape renvoie vers l'endroit où agir", () => {
    const steps = methodSteps({ hasIdentity: false, objectives: 0, personas: 0, diagnostic: null, pillars: [], published: 0, planned: 0 });
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(steps.every((s) => s.href.startsWith("/dashboard/"))).toBe(true);
  });
  it("un pilier incomplet empêche l'étape 5 ; des publications font avancer l'étape 6", () => {
    expect(methodSteps({ ...base, pillars: [full, full, { ...full, kpi: "" }] })[4].done).toBe(false);
    expect(methodSteps({ ...base, pillars: [full, full], published: 0 })[4].done).toBe(false); // moins de 3 piliers
    const s = methodSteps({ ...base, pillars: [full, full, full], published: 5, planned: 3 });
    expect(s[5]).toMatchObject({ done: true, detail: "5 publications publiées." });
  });
});

describe("chaîne stratégique", () => {
  it("relie objectifs, piliers, idées et publications, et isole les piliers sans objectif", () => {
    const rows = strategyChain(
      ["Obtenir des partenaires", "Fidéliser la communauté"],
      [{ id: "a", name: "Partenariats", pct: 40, objective: "obtenir des partenaires", kpi: "RDV" }, { id: "b", name: "Coulisses", pct: 60, objective: "Autre", kpi: null }],
      [{ pillar_id: "a", status: "retenue" }, { pillar_id: "a", status: "a_trier" }, { pillar_id: "a", status: "produite" }, { pillar_id: null, status: "retenue" }],
      [{ pillar: "Partenariats", status: "brouillon" }, { pillar: "partenariats", status: "publie" }, { pillar: "Inconnu", status: "publie" }],
    );
    expect(rows.map((r) => r.objective)).toEqual(["Obtenir des partenaires", "Fidéliser la communauté", "Sans objectif relié"]);
    expect(rows[0].pillars[0]).toMatchObject({ name: "Partenariats", ideas: { total: 3, kept: 2 }, posts: { planned: 1, published: 1 } });
    expect(rows[1].pillars).toEqual([]);
    expect(rows[2].pillars[0].name).toBe("Coulisses");
  });
  it("pas de ligne orpheline quand tout est relié", () => {
    expect(strategyChain(["O"], [{ id: "a", name: "P", objective: "O" }], [], []).map((r) => r.objective)).toEqual(["O"]);
  });
});
