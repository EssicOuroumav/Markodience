import { describe, expect, it } from "vitest";
import { lengthStats, placeholderCount, reportDelays, runChecks, type PlanForChecks } from "./quality";
import { feedbackByTarget } from "./pipeline";
import { baseFor, weekdaysIn } from "./networks";

const row = (day: string, idea = "Reportage : {theme}. Premiers chiffres du terrain.") => ({ day, pillar: "Preuves", format: "Album", idea, hook: "Voici {theme}" });
const tpl = (network: string, days: string[], idea?: string) => {
  const rows = days.map((d) => row(d, idea));
  return { network, avant: rows, pendant: rows, apres: rows, evergreen: rows };
};
const profile = (network: string) => ({ network, headline: "h", lead: "l", frequency: "3 par semaine", format: "f", best_hours: "12h", rules_title: "r", rules: [{ label: "a", text: "b" }], method: "m" });

function plan(over: Partial<PlanForChecks> = {}): PlanForChecks {
  return {
    identity: { mission: "m", tagline: "t", tagline_status: "propose", commitments: { report_days: 7, reply_hours: 24, validation_hours: 24, health_review_hours: 48 }, values: [], tone_table: [], rewrite: { avoid: "a", follow: "b" }, logo_note: "n" },
    pillars: { pillars: [{ title: "A", role: "preuve", pct: 60, purpose: "p", formats: "f" }, { title: "B", role: "appel", pct: 40, purpose: "p", formats: "f" }] },
    themes: Array.from({ length: 10 }, (_, i) => ({ week: i + 1, theme: `Thème concret numéro ${i}`, pillar: i < 6 ? "A" : "B" })),
    networks: [
      { profile: profile("Facebook"), templates: tpl("Facebook", ["Lundi", "Mercredi", "Vendredi"], "Preuve du terrain avec les chiffres confirmés : {theme}") },
      { profile: profile("TikTok"), templates: tpl("TikTok", ["Mardi", "Jeudi", "Dimanche"], "Coulisses filmées par un bénévole face caméra sur {theme}") },
    ],
    organic: { levers: [{ title: "t", why: "w", action: "a" }] },
    kpi: { intro: "i", rows: [], cadences: [] },
    rules: { rules: [{ title: "Bilan", text: "Le bilan chiffré est publié sous 7 jours.", tag: "Process" }] },
    ...over,
  } as unknown as PlanForChecks;
}
const get = (checks: ReturnType<typeof runChecks>, id: string) => checks.find((c) => c.id === id);

describe("contrôles de qualité", () => {
  it("un plan sain réussit tous les contrôles", () => {
    const checks = runChecks(plan());
    expect(checks.filter((c) => !c.ok)).toEqual([]);
  });
  it("détecte des piliers qui ne font pas 100, des semaines sans thème et un déséquilibre", () => {
    const p = plan({ pillars: { pillars: [{ title: "A", role: "preuve", pct: 50, purpose: "p", formats: "f" }, { title: "B", role: "appel", pct: 40, purpose: "p", formats: "f" }] } });
    expect(get(runChecks(p), "piliers-100")?.ok).toBe(false);
    const q = plan({ themes: Array.from({ length: 10 }, (_, i) => ({ week: i + 1, theme: i === 3 ? "[thème à définir]" : "ok concret", pillar: "A" })) });
    expect(get(runChecks(q), "semaines-completes")?.ok).toBe(false);
    expect(get(runChecks(q), "equilibre-piliers")?.ok).toBe(false);
    expect(get(runChecks(q), "equilibre-piliers")?.detail).toContain("« B »");
  });
  it("détecte deux réseaux qui publient les mêmes jours et des idées identiques", () => {
    const p = plan({ networks: [{ profile: profile("Facebook"), templates: tpl("Facebook", ["Lundi", "Mercredi", "Vendredi"], "Preuve du terrain avec les chiffres confirmés : {theme}") }, { profile: profile("Instagram"), templates: tpl("Instagram", ["Lundi", "Mercredi", "Vendredi"], "Preuve du terrain avec les chiffres confirmés : {theme}") }] });
    const checks = runChecks(p);
    expect(get(checks, "cadence-Facebook-Instagram")).toMatchObject({ ok: false, network: "Instagram" });
    expect(get(checks, "idees-differentes")?.ok).toBe(false);
  });
  it("détecte un délai de bilan différent de l'engagement", () => {
    const p = plan({ rules: { rules: [{ title: "Bilan", text: "Publiez le bilan de campagne sous 14 jours. Le compte rendu part en 10 jours.", tag: "x" }] } });
    expect(reportDelays(["Publiez le bilan sous 14 jours."])).toEqual([14]);
    expect(reportDelays(["Répondez sous 48 heures."])).toEqual([]);
    const c = get(runChecks(p), "delai-bilan");
    expect(c?.ok).toBe(false);
    expect(c?.detail).toContain("7 jours");
  });
  it("repère les formules vides et les textes trop longs", () => {
    const p = plan({ organic: { levers: Array.from({ length: 4 }, () => ({ title: "t", why: "Il est important de communiquer.", action: Array(30).fill("mot").join(" ") })) } });
    expect(get(runChecks(p), "formules-vides")?.ok).toBe(false);
    expect(get(runChecks(p), "concision")?.ok).toBe(false);
  });
  it("mesure les longueurs et compte les [X]", () => {
    expect(lengthStats(plan())["thème (réf. 7)"]).toBe(4);
    expect(placeholderCount(plan({ rules: { rules: [{ title: "t", text: "[X] kits et [X] paniers", tag: "x" }] } }))).toBe(2);
  });
});

describe("repères des réseaux", () => {
  it("chaque réseau principal a ses propres jours", () => {
    const d = (n: string) => baseFor(n).days.join();
    expect(new Set([d("Facebook"), d("Instagram"), d("TikTok")]).size).toBe(3);
    expect(weekdaysIn("Lundi, mercredi et vendredi")).toEqual(["Lundi", "Mercredi", "Vendredi"]);
    expect(weekdaysIn("Mardis et jeudis")).toEqual(["Mardi", "Jeudi"]);
    expect(baseFor("Inconnu").days.length).toBe(1);
  });
});

describe("corrections ciblées", () => {
  it("renvoie chaque problème à l'étape qui doit le corriger ; identité et piliers restent à l'utilisateur", () => {
    const p = plan({ networks: [{ profile: profile("Facebook"), templates: tpl("Facebook", ["Lundi"], "idée de fond identique sur {theme} et ses chiffres") }, { profile: profile("Instagram"), templates: tpl("Instagram", ["Lundi"], "idée de fond identique sur {theme} et ses chiffres") }] });
    const checks = runChecks(p);
    const critique = { score: 70, verdict: "v", strengths: [], risks: [], questions: [], issues: [
      { severity: "grave" as const, stage: "rules" as const, where: "règle 3", problem: "trop vague", fix: "préciser" },
      { severity: "grave" as const, stage: "pillars" as const, where: "piliers", problem: "poids", fix: "revoir" },
      { severity: "grave" as const, stage: "templates" as const, network: "Instagram", where: "posts", problem: "même angle", fix: "autre angle" },
    ] };
    const { feedback, unresolved } = feedbackByTarget(checks, critique, p as never);
    expect(feedback.get("rules")?.[0]).toContain("préciser");
    expect(feedback.get("templates:Instagram")?.join(" ")).toContain("autre angle");
    expect(feedback.get("templates:Instagram")?.join(" ")).toContain("Instagram publie les mêmes jours");
    expect(feedback.has("templates:Facebook")).toBe(false);
    expect(unresolved.map((u) => u.stage)).toEqual(["pillars"]);
  });
});
