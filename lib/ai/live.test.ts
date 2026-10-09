import { writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { generateJson } from "./anthropic";
import { identityPrompt, pillarsPrompt, tonePrompt } from "./prompts";
import { identityOutput, pillarsOutput, toneOutput } from "./schemas";
import { mockIdentity, mockPillars, mockTone } from "./mock";

/**
 * Test RÉEL (consomme du crédit, quelques centimes) : ignoré sauf si AI_LIVE=1.
 * Compare les paliers « light » et « heavy » sur une marque fictive et écrit les résultats dans AI_LIVE_OUT.
 * Usage : AI_LIVE=1 AI_LIVE_OUT=/chemin/resultats.json npx vitest run lib/ai/live.test.ts
 */
describe.skipIf(process.env.AI_LIVE !== "1")("génération réelle : Haiku et Sonnet", () => {
  const BRIEFS = {
    ong: {
      brand_name: "Association Espoir Santé", sector: "Associations & ONG", offer: "Dépistage gratuit et accompagnement des personnes touchées par le cancer, campagnes de sensibilisation en Côte d'Ivoire",
      segments: ["Femmes de tous âges, enfants, personnes vulnérables ou en situation de handicap qui n'ont pas accès aux soins", "Donateurs et entreprises partenaires"],
      problem: "L'accès aux soins et au dépistage précoce est difficile pour les personnes sans ressources",
      differentiation: "Des équipes de terrain, des dépistages gratuits dans les villages, un suivi humain après le diagnostic",
      personality: ["Humaine", "Engagée", "Rassurante"], goal: "notoriete" as const, channels: ["Facebook", "WhatsApp", "TikTok", "YouTube"], avoid: "Données médicales individuelles, images choquantes",
    },
    mode: {
    brand_name: "Maison Awa", sector: "Mode et couture", offer: "Tenues sur mesure en pagne et wax pour femmes actives à Abidjan, livrées en 7 jours",
    segments: ["Femmes de 25 à 40 ans, actives, qui veulent des tenues élégantes pour le bureau et les cérémonies"],
    problem: "Les clientes trouvent difficilement des couturiers fiables qui respectent les délais",
    differentiation: "Délais garantis, suivi par WhatsApp à chaque étape, retouches gratuites",
    personality: ["Élégante", "Fiable", "Chaleureuse"], goal: "notoriete" as const, channels: ["Instagram", "Facebook", "WhatsApp", "TikTok"], avoid: "Politique, religion",
    },
  };
  const q = BRIEFS[(process.env.AI_LIVE_BRIEF as keyof typeof BRIEFS) || "mode"];
  const out: Record<string, unknown> = {};
  for (const tier of ["light", "heavy"] as const) {
    it(`identité, piliers et tonalité (${tier})`, async () => {
      const t0 = Date.now();
      const identity = await generateJson(identityPrompt(q), identityOutput, mockIdentity, tier);
      const ctx = { name: q.brand_name, sector: q.sector, identity };
      const pillars = await generateJson(pillarsPrompt(ctx), pillarsOutput, mockPillars, tier);
      const tone = await generateJson(tonePrompt(ctx), toneOutput, mockTone, tier);
      out[tier] = { seconds: Math.round((Date.now() - t0) / 1000), identity, pillars, tone };
      if (process.env.AI_LIVE_OUT) writeFileSync(process.env.AI_LIVE_OUT, JSON.stringify(out, null, 2));
      expect(identity.positioning.length).toBeGreaterThan(20);
      expect(pillars.pillars.length).toBeGreaterThanOrEqual(3);
      expect(tone.do_list.length).toBeGreaterThan(0);
    }, 180_000);
  }
});

/**
 * Objectifs mesurables et audit par réseau (appels réels, quelques centimes). Ignoré sauf AI_LIVE=1.
 * Usage : AI_LIVE=1 AI_LIVE_BRIEF=ong AI_LIVE_OUT=/chemin/objectifs.json npx vitest run lib/ai/live.test.ts -t "objectifs"
 */
import { readFileSync } from "node:fs";
import { auditPrompt } from "./prompts";
import { auditOutput } from "./schemas";
import { normalizeObjectives } from "../objectives";
import { mockAudit } from "./mock";

describe.skipIf(process.env.AI_LIVE !== "1")("objectifs mesurables et audit par réseau", () => {
  it("objectifs : texte + indicateur + cible cohérents", async () => {
    const q = {
      brand_name: "Association Espoir Santé", sector: "Associations & ONG", offer: "Dépistage gratuit et accompagnement des personnes touchées par le cancer",
      segments: ["Femmes et familles vulnérables sans accès aux soins"], problem: "Accès difficile au dépistage précoce", differentiation: "Équipes de terrain et suivi humain",
      personality: ["Humaine", "Engagée", "Rassurante"], goal: "notoriete" as const, channels: ["Facebook", "WhatsApp", "TikTok"], avoid: "",
    };
    const identity = await generateJson(identityPrompt(q), identityOutput, mockIdentity, "heavy");
    const objectives = normalizeObjectives(identity.marketing_objectives);
    if (process.env.AI_LIVE_OUT) writeFileSync(process.env.AI_LIVE_OUT, JSON.stringify(objectives, null, 2));
    expect(objectives.length).toBeGreaterThanOrEqual(3);
    expect(objectives.every((o) => o.text.length > 10)).toBe(true);
  }, 180_000);

  it("audit : une image, réseau Facebook", async () => {
    const data = readFileSync("public/logo-mark.png").toString("base64");
    const blocks = [
      { type: "image" as const, source: { type: "base64" as const, media_type: "image/png" as const, data } },
      { type: "text" as const, text: auditPrompt({ network: "Facebook", name: "Association Espoir Santé", sector: "Associations & ONG", identity: null, pillars: [], tone: null }) },
    ];
    const report = await generateJson(blocks, auditOutput, mockAudit, "heavy");
    if (process.env.AI_LIVE_OUT) writeFileSync(process.env.AI_LIVE_OUT.replace(".json", "-audit.json"), JSON.stringify(report, null, 2));
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.summary.length).toBeGreaterThan(10);
  }, 180_000);
});
