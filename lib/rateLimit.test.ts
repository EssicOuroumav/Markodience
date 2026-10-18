import { describe, expect, it } from "vitest";
import { ipOf, limitKey, memoryLimit } from "./rateLimit";

describe("limitation de débit (repli local)", () => {
  it("autorise jusqu'à la limite, refuse ensuite, ré-autorise après la fenêtre", () => {
    const t = 1_000_000;
    expect([1, 2, 3].map(() => memoryLimit("k1", 3, 1000, t))).toEqual([true, true, true]);
    expect(memoryLimit("k1", 3, 1000, t + 10)).toBe(false);
    expect(memoryLimit("k1", 3, 1000, t + 1500)).toBe(true);
  });
  it("les clés sont indépendantes", () => {
    expect(memoryLimit("a", 1, 1000, 5)).toBe(true);
    expect(memoryLimit("b", 1, 1000, 5)).toBe(true);
  });
  it("une clé du visiteur devient une empreinte de taille fixe, stable et distincte", () => {
    const k = limitKey(`decide:${"x".repeat(5000)}`);
    expect(k.length).toBeLessThan(70);
    expect(k.startsWith("decide:")).toBe(true);
    expect(limitKey("decide:1.2.3.4")).toBe(limitKey("decide:1.2.3.4"));
    expect(limitKey("decide:1.2.3.4")).not.toBe(limitKey("decide:1.2.3.5"));
    expect(limitKey("a:1")).not.toBe(limitKey("b:1"));
  });
});

describe("adresse IP du visiteur", () => {
  const h = (o: Record<string, string>) => ({ get: (k: string) => o[k] ?? null });
  it("prend la première adresse de x-forwarded-for, sinon x-real-ip, sinon « unknown »", () => {
    expect(ipOf(h({ "x-forwarded-for": "1.1.1.1, 10.0.0.2" }))).toBe("1.1.1.1");
    expect(ipOf(h({ "x-real-ip": "2.2.2.2" }))).toBe("2.2.2.2");
    expect(ipOf(h({}))).toBe("unknown");
  });
});
