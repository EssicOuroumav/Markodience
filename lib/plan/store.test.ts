import { describe, expect, it } from "vitest";
import { briefSchema } from "./brief";
import { extractStage, toBriefDraft } from "./extract";
import { validateBrief } from "./handler";
import { mockExtract } from "./mock";
import { runPlan } from "./pipeline";
import { buildSteps, completedStages, planToRows, type StoredDraft } from "./store";
import { weeksOf, type Gen } from "./stages";

// Réponses simulées validées par les vrais schémas : le parcours entier se teste sans crédit.
const gen: Gen = async (_prompt, schema, _tier, mock) => schema.parse(mock!());

const brief = briefSchema.parse({
  name: "Test", kind: "ong", mission: "Aider les familles.", audiences: [{ name: "Donateurs" }], networks: [{ name: "Facebook" }, { name: "Instagram" }, { name: "TikTok" }],
  activities: [{ name: "Campagne A", start: "2026-10-05", end: "2026-11-01", goal: "" }], resources: {}, plan_start: "2026-08-03", weeks: 52,
});

describe("plan complet avec réponses simulées", () => {
  it("traverse toutes les étapes et réussit tous les contrôles du code", async () => {
    const plan = await runPlan(brief, gen, undefined, { repair: false });
    expect(plan.months.reduce((n, m) => n + m.weeks.length, 0)).toBe(52);
    expect(plan.networks.map((n) => n.profile.network)).toEqual(["Facebook", "Instagram", "TikTok"]);
    expect(plan.checks.filter((c) => !c.ok)).toEqual([]);
  });
  it("transforme le plan en lignes pour les onglets", async () => {
    const plan = await runPlan(brief, gen, undefined, { repair: false });
    const draft = { identity: plan.identity, pillars: plan.pillars, themes: plan.months.flatMap((m) => m.weeks).map((w) => ({ week: w.index, theme: w.theme, pillar: w.pillar })), networks: plan.networks, organic: plan.organic, kpi: plan.kpi, rules: plan.rules };
    const rows = planToRows(brief, draft, weeksOf(brief));
    expect(rows.pillars).toHaveLength(plan.pillars.pillars.length);
    expect(rows.pillars[0]).toMatchObject({ name: expect.any(String), pct: expect.any(Number), role: expect.any(String) });
    expect(rows.lines).toHaveLength(3);
    const fb = rows.lines[0];
    expect(fb.entries).toHaveLength(52);
    expect(fb.entries[0]).toMatchObject({ week_number: 1, position: 0, status: "a_venir", phase: expect.any(String) });
    expect(fb.period_start).toBe("2026-08-03");
    expect(fb.period_end).toBe("2027-08-01");
    expect(fb.posts.length).toBe(52 * 3);
    // chaque publication tombe dans sa semaine, au bon jour
    for (const p of fb.posts) {
      const week = weeksOf(brief)[p.week_number - 1];
      expect(p.scheduled_date >= week.start && p.scheduled_date <= week.end).toBe(true);
      expect(p.idea).not.toContain("{theme}");
    }
    expect(rows.tone.do_list.length).toBeGreaterThan(0);
    expect(rows.identity).toMatchObject({ positioning: plan.identity.mission, logo_note: plan.identity.logo_note });
  }, 30_000); // construit un plan complet : près de 5 s sur une machine chargée, la limite par défaut échouait au hasard
});

describe("cahier des charges", () => {
  it("l'extraction simulée est valide et se convertit en brouillon de fiche", () => {
    const e = extractStage.parse(mockExtract("AICHA est une ONG"));
    const draft = toBriefDraft(e, "2026-10-09");
    expect(draft.plan_start).toBe("2026-10-12"); // premier lundi après le 9 octobre 2026 (vendredi)
    expect(draft.weeks).toBe(52);
    expect(draft.networks.length).toBeGreaterThan(0);
  });
  it("refuse un réseau en double, une activité à l'envers et un début un autre jour que lundi", () => {
    expect(validateBrief(brief)).toBeNull();
    expect(validateBrief({ ...brief, networks: [{ name: "Facebook", audience: "" }, { name: "facebook", audience: "" }] })).toContain("deux fois");
    expect(validateBrief({ ...brief, activities: [{ name: "X", start: "2026-10-05", end: "2026-10-01", goal: "" }] })).toContain("avant son début");
    expect(validateBrief({ ...brief, plan_start: "2026-08-04" })).toContain("lundi");
  });
  it("liste les étapes, une par réseau, et reprend où l'on s'était arrêté", () => {
    const steps = buildSteps(brief).map((s) => s.key);
    expect(steps).toEqual(["identity", "pillars", "calendar", "network:Facebook", "network:Instagram", "network:TikTok", "organic", "kpi", "rules", "review", "apply"]);
    const d = { brief, stage_runs: {}, started_at: "x", identity: {}, pillars: {}, networks: { Facebook: {} } } as unknown as StoredDraft;
    expect(completedStages(d)).toEqual(["start", "identity", "pillars", "network:Facebook"]);
    expect(completedStages(null)).toEqual([]);
  });
});

import { briefProblems } from "./brief";
describe("problèmes de la fiche", () => {
  const ok = { name: "A", mission: "m", audiences: [{ name: "x" }], networks: [{ name: "Facebook" }], plan_start: "2026-08-03", activities: [{ name: "c", start: "2026-10-01", end: "2026-10-31" }] };
  it("une fiche complète n'a aucun problème", () => expect(briefProblems(ok)).toEqual([]));
  it("liste chaque manque en français", () => {
    const p = briefProblems({ name: " ", mission: "", audiences: [{ name: "" }], networks: [], plan_start: "2026-08-04", activities: [{ name: "Rentrée", start: "", end: "" }, { name: "Bilan", start: "2026-10-10", end: "2026-10-01" }, { name: "", start: "2026-10-01", end: "2026-10-02" }] });
    expect(p).toEqual(["Le nom de la marque.", "La mission, en une ou deux phrases.", "Au moins un public à toucher.", "Au moins un réseau social.", "Les dates de « Rentrée » (début et fin).", "« Bilan » se termine avant son début.", "Le nom de chaque activité.", "La date de début du plan : un lundi."]);
  });
  it("repère un réseau cité deux fois", () => expect(briefProblems({ ...ok, networks: [{ name: "TikTok" }, { name: " tiktok " }] })).toContain("Un réseau est cité deux fois."));
});
