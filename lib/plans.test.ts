import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { quotaMessage } from "./quota";
import { PAID_FEATURES, PLANS, canCreateProfile, hasFeature, normalizeSeats, priceFor } from "./plans";

describe("paliers", () => {
  it("gratuit : 3 onglets, filigrane", () => {
    expect(PLANS.gratuit.features).toEqual(["identity", "pillars", "tone"]);
    expect(PLANS.gratuit.exportWatermark).toBe(true);
    expect(hasFeature("gratuit", "audit")).toBe(false);
  });
  it("pro et agence débloquent les 5 onglets", () => {
    for (const f of ["audit", "editorial", "kpi", "rules", "lives"] as const) {
      expect(hasFeature("pro", f)).toBe(true);
      expect(hasFeature("agence", f)).toBe(true);
    }
    expect(hasFeature("pro", "white_label")).toBe(false);
    expect(hasFeature("agence", "white_label")).toBe(true);
  });
  it("limites de profils", () => {
    expect(canCreateProfile("gratuit", 0)).toBe(true);
    expect(canCreateProfile("gratuit", 1)).toBe(false);
    expect(canCreateProfile("pro", 2)).toBe(true);
    expect(canCreateProfile("pro", 3)).toBe(false);
    expect(canCreateProfile("agence", 9)).toBe(true);
    expect(canCreateProfile("agence", 10)).toBe(false);
  });
  it("prix : le montant est toujours calculé, jamais fourni", () => {
    expect(priceFor("pro")).toBe(12000);
    expect(priceFor("agence", 2)).toBe(36000);
    expect(priceFor("agence", 5)).toBe(90000);
  });
  it("sièges", () => {
    expect(normalizeSeats("agence", 1)).toBeNull();
    expect(normalizeSeats("agence", 2)).toBe(2);
    expect(normalizeSeats("agence", "3")).toBe(3);
    expect(normalizeSeats("agence", 2.5)).toBeNull();
    expect(normalizeSeats("agence", 51)).toBeNull();
    expect(normalizeSeats("pro", 1)).toBe(1);
    expect(normalizeSeats("pro", 4)).toBeNull();
  });
});

describe("quota IA", () => {
  it("limites croissantes par palier", () => {
    expect(PLANS.gratuit.aiDailyLimit).toBeGreaterThan(0);
    expect(PLANS.pro.aiDailyLimit).toBeGreaterThan(PLANS.gratuit.aiDailyLimit);
    expect(PLANS.agence.aiDailyLimit).toBeGreaterThan(PLANS.pro.aiDailyLimit);
  });
  it("messages", () => {
    expect(quotaMessage("gratuit", 10)).toContain("10 générations par jour");
    expect(quotaMessage("gratuit", 10)).toContain("Pro");
    expect(quotaMessage("pro", 60)).not.toContain("palier Pro en offre");
  });
});

describe("cohérence avec la migration RLS", () => {
  const sql = readFileSync("supabase/migrations/20261001000400_plan_gating.sql", "utf8");
  const limits = readFileSync("supabase/migrations/20261001000600_profile_limits.sql", "utf8");
  it("limites de profils identiques à plans.ts", () => {
    expect(limits).toContain(`when 'gratuit' then ${PLANS.gratuit.maxProfiles}`);
    expect(limits).toContain(`when 'pro' then ${PLANS.pro.maxProfiles}`);
    expect(limits).toContain(`when 'agence' then ${PLANS.agence.maxProfiles}`);
  });
  it("le propriétaire contourne la limite", () => expect(limits).toContain("'admin'"));
  it("les tables payantes sont verrouillées pour le palier gratuit", () => {
    expect(PAID_FEATURES.sort()).toEqual(["audit", "editorial", "kpi", "library", "lives", "rules"]);
    for (const t of ["audits", "editorial_lines", "editorial_entries", "kpi_reports", "operational_rules", "live_guides", "live_team_members", "live_scripts"]) {
      expect(sql).toContain(`'${t}'`);
    }
    expect(readFileSync("supabase/migrations/20261009000300_library.sql", "utf8")).toContain("plan_gate_library_upload");
  });
});
