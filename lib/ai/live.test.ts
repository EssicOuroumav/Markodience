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
  const q = {
    brand_name: "Maison Awa", sector: "Mode et couture", offer: "Tenues sur mesure en pagne et wax pour femmes actives à Abidjan, livrées en 7 jours",
    segments: ["Femmes de 25 à 40 ans, actives, qui veulent des tenues élégantes pour le bureau et les cérémonies"],
    problem: "Les clientes trouvent difficilement des couturiers fiables qui respectent les délais",
    differentiation: "Délais garantis, suivi par WhatsApp à chaque étape, retouches gratuites",
    personality: ["Élégante", "Fiable", "Chaleureuse"], goal: "notoriete" as const, channels: ["Instagram", "Facebook", "WhatsApp", "TikTok"], avoid: "Politique, religion",
  };
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
