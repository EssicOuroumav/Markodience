import { describe, expect, it } from "vitest";
import { deadlineFor, deadlineState, formatNumber, kpiData, monthLabel, monthStart, recentMonths, wasOnTime, EMPTY_KPI } from "./kpi";
import { buildKpiPdf, kpiFileName } from "./kpiPdf";

describe("échéance", () => {
  it("jour fixé du mois suivant", () => {
    expect(deadlineFor("2026-10-01", 5)).toBe("2026-11-05");
    expect(deadlineFor("2026-12-01", 5)).toBe("2027-01-05");
  });
  it("borne le jour entre 1 et 28", () => expect(deadlineFor("2026-01-01", 31)).toBe("2026-02-28"));
  it("états", () => {
    expect(deadlineState("2026-11-03", "2026-11-05", null)).toBe("pending");
    expect(deadlineState("2026-11-05", "2026-11-05", null)).toBe("pending");
    expect(deadlineState("2026-11-06", "2026-11-05", null)).toBe("late");
    expect(deadlineState("2026-12-30", "2026-11-05", "2026-11-04T10:00:00Z")).toBe("submitted");
  });
  it("à temps / en retard", () => {
    expect(wasOnTime("2026-11-05T23:00:00Z", "2026-11-05")).toBe(true);
    expect(wasOnTime("2026-11-06T00:10:00Z", "2026-11-05")).toBe(false);
  });
});

describe("mois & nombres", () => {
  it("monthStart / libellé", () => {
    expect(monthStart("2026-10-17")).toBe("2026-10-01");
    expect(monthLabel("2026-10-01")).toBe("octobre 2026");
  });
  it("12 derniers mois, mois courant en premier", () => {
    const m = recentMonths(new Date(2026, 9, 15));
    expect(m[0]).toBe("2026-10-01");
    expect(m).toHaveLength(12);
    expect(m[11]).toBe("2025-11-01");
  });
  it("séparateur ASCII", () => expect(formatNumber(1234567)).toBe("1 234 567"));
});

describe("validation", () => {
  it("refuse négatifs et décimaux", () => {
    expect(kpiData.safeParse({ ...EMPTY_KPI, reach: -1 }).success).toBe(false);
    expect(kpiData.safeParse({ ...EMPTY_KPI, reach: 1.5 }).success).toBe(false);
  });
  it("accepte les valeurs par défaut", () => expect(kpiData.safeParse(EMPTY_KPI).success).toBe(true));
});

describe("PDF", () => {
  const data = { ...EMPTY_KPI, reach: 12500, engagement: 830, new_followers: 120, posts_done: 14, posts_planned: 16, best_content: "Reel atelier couture", notes: "RAS" };
  it("nom de fichier", () => expect(kpiFileName("Marque Été & Co", "2026-10-01")).toBe("KPI_MarqueEteCo_Octobre2026.pdf"));
  it("génère un PDF A4 d'une page avec les valeurs", () => {
    const doc = buildKpiPdf({ brandName: "Ma Marque", month: "2026-10-01", data, exportDate: "2026-11-02" });
    const raw = doc.output();
    expect(raw.startsWith("%PDF")).toBe(true);
    expect(doc.getNumberOfPages()).toBe(1);
    expect(raw).toContain("RAPPORT KPI - octobre 2026");
    expect(raw).toContain("12 500");
    expect(raw).toContain("14 / 16");
    expect(raw).not.toContain("version gratuite");
  });
  it("filigrane du palier Gratuit sur chaque page", () => {
    const long = { ...data, notes: "ligne ".repeat(900) };
    const doc = buildKpiPdf({ brandName: "Ma Marque", month: "2026-10-01", data: long, watermark: true });
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    const occurrences = doc.output().split("version gratuite").length - 1;
    expect(occurrences).toBe(doc.getNumberOfPages());
  });
});
