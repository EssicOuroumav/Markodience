import { describe, expect, it } from "vitest";
import { daysUntil, subscriptionNotice } from "./subscription";

const now = new Date("2026-10-10T15:00:00Z");

describe("daysUntil", () => {
  it("compte les jours en UTC", () => {
    expect(daysUntil("2026-10-10", now)).toBe(0);
    expect(daysUntil("2026-10-17", now)).toBe(7);
    expect(daysUntil("2026-10-09", now)).toBe(-1);
  });
});

describe("subscriptionNotice", () => {
  it("avertit 7 jours avant l'expiration d'un palier payant", () => {
    expect(subscriptionNotice("pro", "2026-10-17", false, now)).toEqual({ kind: "expiring", days: 7 });
    expect(subscriptionNotice("pro", "2026-10-10", false, now)).toEqual({ kind: "expiring", days: 0 });
    expect(subscriptionNotice("agence", "2026-10-18", false, now)).toBeNull();
  });
  it("signale un abonnement échu (retour au gratuit)", () => {
    expect(subscriptionNotice("gratuit", "2026-10-01", false, now)).toEqual({ kind: "expired", daysAgo: 9 });
  });
  it("ne dit rien au propriétaire ni sans échéance", () => {
    expect(subscriptionNotice("pro", "2026-10-11", true, now)).toBeNull();
    expect(subscriptionNotice("pro", null, false, now)).toBeNull();
    expect(subscriptionNotice("gratuit", null, false, now)).toBeNull();
  });
});
