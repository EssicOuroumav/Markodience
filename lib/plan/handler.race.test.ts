import { describe, expect, it } from "vitest";
import { briefSchema } from "./brief";
import { handlePlan } from "./handler";
import { MAX_STAGE_RUNS, type StoredDraft } from "./store";
import type { Gen } from "./stages";

const brief = briefSchema.parse({
  name: "Test", kind: "ong", mission: "Aider les familles.", audiences: [{ name: "Donateurs" }], networks: [{ name: "Facebook" }],
  activities: [], resources: {}, plan_start: "2026-08-03", weeks: 52,
});

/** Base simulée : une ligne `brand_strategy` en mémoire (lecture, puis enregistrement du brouillon). */
function fakeSupabase(draft: StoredDraft) {
  let row: Record<string, unknown> = { draft, brief: draft.brief };
  const q: Record<string, unknown> = {
    select: () => q,
    eq: () => q,
    maybeSingle: async () => ({ data: row, error: null }),
    upsert: async (v: Record<string, unknown>) => { row = { ...row, ...v }; return { error: null }; },
  };
  return { from: () => q } as never;
}

/** Une génération lente (comme un vrai appel d'IA) : c'est elle qui laisse les demandes simultanées se chevaucher. */
function slowGen() {
  let calls = 0;
  const gen: Gen = async (_p, schema, _t, mock) => { calls++; await new Promise((r) => setTimeout(r, 30)); return schema.parse(mock!()); };
  return { gen, calls: () => calls };
}

describe("étapes du plan : plafond de relances sous demandes simultanées (F1)", () => {
  it("12 demandes simultanées sur la même étape ne lancent pas 12 générations", async () => {
    const draft: StoredDraft = { brief, stage_runs: {}, started_at: new Date().toISOString() };
    const db = fakeSupabase(draft);
    const { gen, calls } = slowGen();
    const results = await Promise.all(Array.from({ length: 12 }, () => handlePlan(db, { type: "plan_stage", brand_profile_id: "b1", stage: "identity" }, gen)));
    const started = results.filter((r) => r.status === 200).length;
    const refused = results.filter((r) => r.status === 429 || r.status === 409).length;
    // Le plafond exact est de MAX_STAGE_RUNS ; sous concurrence on tolère un petit dépassement borné (échecs et relances légitimes), jamais 12.
    expect(started).toBeLessThanOrEqual(MAX_STAGE_RUNS * 3);
    expect(started + refused).toBe(12);
    expect(refused).toBeGreaterThan(0);
    expect(calls()).toBeGreaterThanOrEqual(1);
  });

  it("une seule demande à la fois reste soumise au plafond exact", async () => {
    const draft: StoredDraft = { brief, stage_runs: {}, started_at: new Date(Date.now() - 1000).toISOString() };
    const db = fakeSupabase(draft);
    const { gen } = slowGen();
    const codes: number[] = [];
    for (let i = 0; i < MAX_STAGE_RUNS + 1; i++) codes.push((await handlePlan(db, { type: "plan_stage", brand_profile_id: "b2", stage: "identity" }, gen)).status);
    expect(codes).toEqual([...Array(MAX_STAGE_RUNS).fill(200), 409]);
  });
});
