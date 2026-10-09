import { describe, expect, it } from "vitest";
import { summaryCsv, uniqueFolderNames } from "./multiExport";
import { cleanAgencyName, footerBrand } from "./whiteLabel";
import { buildKpiPdf } from "./kpiPdf";
import { EMPTY_KPI } from "./kpi";

describe("export multi-clients", () => {
  it("donne un nom de dossier sûr et unique à chaque marque", () => {
    expect(uniqueFolderNames(["ONG Aïcha", "ong aicha", "../../etc", "***", "ONG Aïcha"])).toEqual(["ONG-Aicha", "ong-aicha-2", "etc", "Marque", "ONG-Aicha-3"]);
  });
  it("synthèse CSV lisible par Excel, protégée contre les formules", () => {
    const csv = summaryCsv([
      { brand: "=CMD()", month: "2026-10-01", submitted: true, data: { ...EMPTY_KPI, reach: 1200, engagement: 80, new_followers: 25, posts_done: 9, posts_planned: 12 } },
      { brand: 'Marque; "B"', month: "2026-10-01", submitted: false, data: null },
    ]);
    expect(csv.startsWith("﻿Marque;Mois;")).toBe(true);
    expect(csv).toContain("'=CMD();octobre 2026;oui;1200;80;25;9;12");
    expect(csv).toContain('"Marque; ""B""";octobre 2026;non;;;;;');
    expect(csv.split("\r\n")).toHaveLength(4);
  });
});

describe("marque blanche", () => {
  it("le nom d'agence remplace Markodience seulement au palier Agence", () => {
    expect(footerBrand("agence", { agency_name: "  Agence   Baobab " })).toBe("Agence Baobab");
    expect(footerBrand("agence", {})).toBe("");
    expect(footerBrand("pro", { agency_name: "Agence Baobab" })).toBe("Markodience");
    expect(footerBrand("gratuit", null)).toBe("Markodience");
  });
  it("nettoie le nom saisi", () => {
    expect(cleanAgencyName("a\nb\t c")).toBe("a b c");
    expect(cleanAgencyName("x".repeat(100))).toHaveLength(60);
    expect(cleanAgencyName(42)).toBe("");
  });
  it("le PDF accepte un pied de page vide", () => {
    expect(() => buildKpiPdf({ brandName: "M", month: "2026-10-01", data: EMPTY_KPI, footer: "" })).not.toThrow();
  });
});
