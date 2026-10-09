import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, it } from "vitest";
import { generateJson, usageLog } from "../ai/anthropic";
import { briefSchema } from "./brief";
import { runPlan, type Gen } from "./pipeline";
import { lengthStats, placeholderCount } from "./quality";

/**
 * ESSAI RÉEL (consomme du crédit) : ignoré sauf si AI_LIVE=1. Rejoue le cas AICHA et écrit le plan dans AI_LIVE_OUT.
 * Usage : AI_LIVE=1 AI_LIVE_OUT=/chemin/plan.json npx vitest run lib/plan/spike.live.test.ts
 */
const AICHA = briefSchema.parse({
  name: "AICHA",
  kind: "ong",
  country: "Côte d'Ivoire",
  mission: "Association Islamique Caritative Humanitaire Active : porter secours et assistance aux populations vulnérables, sans distinction politique, ethnique, raciale ni religieuse, en éducation, santé et action sociale.",
  offer: "Kits scolaires pour enfants vulnérables, dépistages et cliniques mobiles de santé, paniers alimentaires et habits de fête pour familles démunies.",
  audiences: [
    { name: "Donateurs fidèles et diaspora ivoirienne", description: "Adultes, plus âgés, donateurs réguliers, partenaires institutionnels" },
    { name: "Jeunes urbains d'Abidjan", description: "18-30 ans, sensibles au visuel et à la vidéo courte, relais potentiels et bénévoles" },
  ],
  networks: [
    { name: "Facebook", audience: "Donateurs fidèles, diaspora, partenaires institutionnels" },
    { name: "Instagram", audience: "Jeunes urbains, sensibles à l'esthétique" },
    { name: "TikTok", audience: "Plus jeunes, attentifs à l'authenticité" },
  ],
  activities: [
    { name: "En Route pour l'École", start: "2026-08-10", end: "2026-09-06", goal: "Collecter et distribuer des kits scolaires avant la rentrée" },
    { name: "Vague Rose et Rouge", start: "2026-10-05", end: "2026-11-01", goal: "Dépistage du cancer du sein et du col de l'utérus, collecte de don de sang" },
    { name: "Semaine et Clinique du Diabète", start: "2026-11-09", end: "2026-11-22", goal: "Dépistage de masse du diabète autour de la journée mondiale du 14 novembre" },
    { name: "Paniers du Ramadan et Clinique Mobile", start: "2027-01-18", end: "2027-02-21", goal: "Collecter et distribuer des paniers alimentaires avant la mi-Ramadan ; consultations en clinique mobile" },
    { name: "Habits Neufs pour Ma Tabaski", start: "2027-04-19", end: "2027-05-15", goal: "Collecter et distribuer des habits neufs aux enfants avant la Tabaski" },
  ],
  resources: { ad_budget: "aucun", team: "Un community manager et des bénévoles", validators: ["Direction Communication", "Référent médical partenaire (contenus santé)"] },
  decisions: ["Trois publications par semaine sur chacun des trois réseaux (demande de la direction)", "Aucune publicité payante"],
  sensitivities: ["Mineurs et consentement des tuteurs", "Informations de santé", "Neutralité politique absolue", "Image digne des bénéficiaires, jamais misérabiliste", "Repères islamiques (zakat, sadaka) sans exclure personne"],
  tone_words: ["digne", "rigoureux", "chaleureux"],
  avoid: "Politique, misérabilisme, promesses non tenables",
  plan_start: "2026-08-03",
  weeks: 52,
});

describe.skipIf(process.env.AI_LIVE !== "1")("plan stratégique complet (cas AICHA)", () => {
  it("génère le plan et mesure le coût", async () => {
    // Cache des étapes déjà payées : relancer l'essai ne repaie pas ce qui a réussi.
    const cachePath = process.env.AI_LIVE_OUT ? `${process.env.AI_LIVE_OUT}.cache.json` : null;
    const cache: Record<string, unknown> = cachePath && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
    const gen: Gen = async (prompt, schema, tier) => {
      const key = createHash("sha1").update(prompt).digest("hex");
      if (key in cache) return schema.parse(cache[key]);
      const out = await generateJson(prompt, schema, () => { throw new Error("pas de simulation pour l'essai"); }, tier ?? "heavy", { thinking: "off", maxTokens: 8192 });
      cache[key] = out;
      if (cachePath) writeFileSync(cachePath, JSON.stringify(cache));
      return out;
    };
    const t0 = Date.now();
    const plan = await runPlan(AICHA, gen, (s) => console.log("étape :", s));
    const input = usageLog.reduce((n, u) => n + u.input, 0);
    const output = usageLog.reduce((n, u) => n + u.output, 0);
    const cost = (input * 2 + output * 10) / 1_000_000;
    const themes = plan.months.flatMap((m) => m.weeks).map((w) => ({ week: w.index, theme: w.theme, pillar: w.pillar }));
    const forChecks = { identity: plan.identity, pillars: plan.pillars, themes, networks: plan.networks, organic: plan.organic, kpi: plan.kpi, rules: plan.rules };
    const quality = { checks: plan.checks.map((c) => `${c.ok ? "OK    " : "ÉCHEC "} ${c.detail}`), longueurs: lengthStats(forChecks), marqueurs_X: placeholderCount(forChecks), score_avant: plan.critiqueBefore.score, score_apres: plan.critique.score, etapes_corrigees: plan.repaired };
    const report = { seconds: Math.round((Date.now() - t0) / 1000), calls: usageLog.length, input, output, cost_usd: Number(cost.toFixed(3)), quality, plan };
    if (process.env.AI_LIVE_OUT) writeFileSync(process.env.AI_LIVE_OUT, JSON.stringify(report, null, 2));
    console.log(JSON.stringify({ ...report, plan: undefined }, null, 1));
  }, 900_000);
});
