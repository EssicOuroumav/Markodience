import { describe, expect, it } from "vitest";
import { METRIC_INFO, buildIndicator, checklistProgress, customIndicators, customKey, indicatorValue, normalizeObjectives, objectiveProgress, periodKey, periodLabel, periodsSince, toggleDone, uniqueIndicators } from "./objectives";
import { EMPTY_KPI, kpiData } from "./kpi";

const now = new Date(2026, 9, 15);
const rep = (month: string, data: Record<string, unknown>) => ({ month, data });
const ind = (builtin: "reach" | "new_followers" | "posts_done" | "engagement", mode?: "monthly" | "cumulative") => buildIndicator({ builtin, mode })!;

describe("indicateurs", () => {
  it("un indicateur prédéfini garde sa clé, son libellé et sa période par défaut", () => {
    expect(buildIndicator({ builtin: "reach" })).toEqual({ key: "reach", label: "Portée mensuelle", unit: "personnes", mode: "monthly", builtin: "reach" });
    expect(buildIndicator({ builtin: "new_followers" })?.mode).toBe("cumulative");
    expect(buildIndicator({ builtin: "new_followers", mode: "monthly" })?.mode).toBe("monthly");
  });
  it("un indicateur personnalisé a une clé stable dérivée de son nom", () => {
    expect(customKey("Contacts WhatsApp")).toBe("c_contacts_whatsapp");
    expect(customKey("Dépistés / mois !")).toBe("c_depistes_mois");
    expect(customKey("!!!")).toBe("c_indicateur");
    expect(buildIndicator({ label: " Contacts WhatsApp ", unit: "contacts", mode: "monthly" })).toEqual({ key: "c_contacts_whatsapp", label: "Contacts WhatsApp", unit: "contacts", mode: "monthly" });
  });
  it("refuse un indicateur sans nom exploitable", () => {
    expect(buildIndicator({ label: "" })).toBeNull();
    expect(buildIndicator({ label: "x" })).toBeNull();
    expect(buildIndicator({})).toBeNull();
  });
  it("les indicateurs prédéfinis correspondent aux champs du rapport mensuel", () => {
    expect(Object.keys(METRIC_INFO).sort()).toEqual(["engagement", "new_followers", "posts_done", "reach"]);
    for (const info of Object.values(METRIC_INFO)) {
      expect(info.help.length).toBeGreaterThan(30);
      expect(info.example).toMatch(/\d/);
    }
  });
});

describe("normalizeObjectives", () => {
  it("accepte les anciens objectifs en texte simple", () => {
    expect(normalizeObjectives(["Gagner des abonnés", "  "], now)).toEqual([{ text: "Gagner des abonnés" }]);
  });
  it("convertit l'ancien format (metric + target)", () => {
    expect(normalizeObjectives([{ text: "A", metric: "new_followers", target: 1000 }], now)).toEqual([{ text: "A", indicator: ind("new_followers"), target: 1000, since: "2026-10-01" }]);
    expect(normalizeObjectives([{ text: "B", metric: "reach", target: 50000 }], now)).toEqual([{ text: "B", indicator: ind("reach"), target: 50000 }]);
  });
  it("accepte un indicateur personnalisé venant de l'IA", () => {
    const out = normalizeObjectives([{ text: "Collecter 100 contacts WhatsApp par mois", indicator: { label: "Contacts WhatsApp", unit: "contacts", mode: "monthly", builtin: null }, target: 100 }], now);
    expect(out).toEqual([{ text: "Collecter 100 contacts WhatsApp par mois", indicator: { key: "c_contacts_whatsapp", label: "Contacts WhatsApp", unit: "contacts", mode: "monthly" }, target: 100 }]);
  });
  it("un cumul reçoit le mois courant comme départ, un indicateur mensuel non", () => {
    const [a] = normalizeObjectives([{ text: "A", indicator: { label: "Dons reçus", unit: "FCFA", mode: "cumulative" }, target: 1e6 }], now);
    expect(a.since).toBe("2026-10-01");
    const [b] = normalizeObjectives([{ text: "B", indicator: { label: "Dons reçus", unit: "FCFA", mode: "monthly" }, target: 1e6 }], now);
    expect(b.since).toBeUndefined();
  });
  it("retire une mesure incomplète ou invalide, garde le texte", () => {
    expect(normalizeObjectives([{ text: "C", metric: "reach" }, { text: "D", target: 5 }, { text: "E", metric: "inconnu", target: 5 }, { text: "F", indicator: { label: "" }, target: 5 }], now)).toEqual([{ text: "C" }, { text: "D" }, { text: "E" }, { text: "F" }]);
  });
  it("ignore ce qui n'est pas une liste ou un objectif valide", () => {
    expect(normalizeObjectives(null)).toEqual([]);
    expect(normalizeObjectives([42, { rien: 1 }, { text: "ok" }], now)).toEqual([{ text: "ok" }]);
  });
  it("uniqueIndicators / customIndicators : un champ par indicateur, le premier nom fait foi", () => {
    const objs = normalizeObjectives([
      { text: "A", indicator: { label: "Contacts WhatsApp", unit: "contacts", mode: "monthly" }, target: 100 },
      { text: "B", indicator: { label: "contacts whatsapp", unit: "x", mode: "cumulative" }, target: 600 },
      { text: "C", metric: "reach", target: 10 },
    ], now);
    expect(uniqueIndicators(objs).map((i) => i.key)).toEqual(["c_contacts_whatsapp", "reach"]);
    expect(customIndicators(objs)).toHaveLength(1);
    expect(customIndicators(objs)[0].label).toBe("Contacts WhatsApp");
  });
});

describe("objectiveProgress", () => {
  const reports = [rep("2026-08-01", { reach: 20000, new_followers: 100 }), rep("2026-09-01", { reach: 40000, new_followers: 250 }), rep("2026-10-01", { reach: 50000, new_followers: 150 })];
  it("indicateur mensuel : compare le dernier rapport à la cible", () => {
    expect(objectiveProgress({ text: "x", indicator: ind("reach"), target: 100000 }, reports)).toMatchObject({ current: 50000, percent: 50, reached: false, basis: "Dernier rapport : octobre 2026" });
  });
  it("indicateur cumulatif : additionne depuis la date de départ", () => {
    expect(objectiveProgress({ text: "x", indicator: ind("new_followers"), target: 1000, since: "2026-09-01" }, reports)).toMatchObject({ current: 400, percent: 40, basis: "Cumul depuis septembre 2026" });
  });
  it("nouveaux abonnés « par mois » : compare le dernier mois, sans additionner", () => {
    expect(objectiveProgress({ text: "x", indicator: ind("new_followers", "monthly"), target: 300 }, reports)).toMatchObject({ current: 150, percent: 50 });
  });
  it("indicateur personnalisé : lit data.custom", () => {
    const custom = buildIndicator({ label: "Contacts WhatsApp", unit: "contacts", mode: "monthly" })!;
    const r = [rep("2026-09-01", { custom: { c_contacts_whatsapp: 60 } }), rep("2026-10-01", { custom: { c_contacts_whatsapp: 80 } })];
    expect(objectiveProgress({ text: "x", indicator: custom, target: 100 }, r)).toMatchObject({ current: 80, percent: 80, reached: false });
    const cumul = { ...custom, mode: "cumulative" as const };
    expect(objectiveProgress({ text: "x", indicator: cumul, target: 200, since: "2026-09-01" }, r)).toMatchObject({ current: 140, percent: 70 });
    expect(indicatorValue({ custom: { c_autre: 1 } }, custom)).toBeNull();
  });
  it("plafonne le pourcentage à 100 et signale la cible atteinte", () => {
    expect(objectiveProgress({ text: "x", indicator: ind("reach"), target: 30000 }, reports)).toMatchObject({ current: 50000, percent: 100, reached: true });
  });
  it("null sans mesure, sans rapport utile ou avant la date de départ", () => {
    expect(objectiveProgress({ text: "x" }, reports)).toBeNull();
    expect(objectiveProgress({ text: "x", indicator: ind("reach"), target: 10 }, [])).toBeNull();
    expect(objectiveProgress({ text: "x", indicator: ind("new_followers"), target: 10, since: "2026-11-01" }, reports)).toBeNull();
    expect(objectiveProgress({ text: "x", indicator: ind("posts_done"), target: 10 }, reports)).toBeNull();
  });
  it("ignore les rapports sans valeur numérique", () => {
    expect(objectiveProgress({ text: "x", indicator: ind("reach"), target: 10 }, [rep("2026-10-01", { reach: "beaucoup" })])).toBeNull();
  });
});

describe("rapport mensuel et indicateurs personnalisés", () => {
  it("accepte data.custom, le prend vide par défaut, refuse une clé ou une valeur invalide", () => {
    expect(kpiData.parse({ ...EMPTY_KPI, custom: { c_contacts_whatsapp: 80 } }).custom).toEqual({ c_contacts_whatsapp: 80 });
    const legacy = Object.fromEntries(Object.entries(EMPTY_KPI).filter(([k]) => k !== "custom"));
    expect(kpiData.parse(legacy).custom).toEqual({});
    expect(kpiData.safeParse({ ...EMPTY_KPI, custom: { "mauvaise clé": 1 } }).success).toBe(false);
    expect(kpiData.safeParse({ ...EMPTY_KPI, custom: { c_x: -1 } }).success).toBe(false);
  });
});

describe("objectifs à cocher", () => {
  it("clés et libellés de période", () => {
    expect(periodKey(new Date(2026, 9, 15), "monthly")).toBe("2026-10");
    expect(periodKey(new Date(2026, 9, 15), "quarterly")).toBe("2026-Q4");
    expect(periodKey("2026-03-31", "quarterly")).toBe("2026-Q1");
    expect(periodKey("2026-04-01", "quarterly")).toBe("2026-Q2");
    expect(periodLabel("2026-10")).toBe("octobre 2026");
    expect(periodLabel("2026-Q4")).toBe("T4 2026");
  });
  it("périodes écoulées depuis le début, période en cours incluse", () => {
    expect(periodsSince("2026-08-01", new Date(2026, 9, 15), "monthly")).toEqual(["2026-08", "2026-09", "2026-10"]);
    expect(periodsSince("2026-08-01", new Date(2026, 9, 15), "quarterly")).toEqual(["2026-Q3", "2026-Q4"]);
    expect(periodsSince("2026-10-01", new Date(2026, 9, 15), "quarterly")).toEqual(["2026-Q4"]);
    expect(periodsSince("2025-11-01", new Date(2026, 1, 1), "monthly")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
  });
  it("normalise un objectif à cocher (format utilisateur ou IA) sans mesure", () => {
    expect(normalizeObjectives([{ text: "Bilan trimestriel", check: { frequency: "quarterly" } }], now)).toEqual([{ text: "Bilan trimestriel", check: { frequency: "quarterly", since: "2026-10-01", done: [] } }]);
    expect(normalizeObjectives([{ text: "Bilan", frequency: "monthly" }], now)[0].check).toEqual({ frequency: "monthly", since: "2026-10-01", done: [] });
    expect(normalizeObjectives([{ text: "x", check: { frequency: "chaque jour" } }], now)).toEqual([{ text: "x" }]);
  });
  it("garde seulement les périodes valides de la bonne fréquence, sans doublon", () => {
    const [o] = normalizeObjectives([{ text: "x", check: { frequency: "quarterly", since: "2026-07-01", done: ["2026-Q3", "2026-Q3", "2026-10", "n'importe quoi", "2026-Q9"] } }], now);
    expect(o.check?.done).toEqual(["2026-Q3"]);
  });
  it("une mesure complète l'emporte sur un suivi à cocher", () => {
    const [o] = normalizeObjectives([{ text: "x", metric: "reach", target: 10, check: { frequency: "monthly" } }], now);
    expect(o.indicator?.key).toBe("reach");
    expect(o.check).toBeUndefined();
  });
  it("avancement : périodes tenues sur périodes écoulées", () => {
    const check = { frequency: "monthly" as const, since: "2026-08-01", done: ["2026-08", "2026-10"] };
    expect(checklistProgress(check, new Date(2026, 9, 15))).toMatchObject({ done: 2, total: 3, percent: 67, currentKey: "2026-10", currentDone: true });
    expect(checklistProgress({ ...check, done: ["2026-08"] }, new Date(2026, 9, 15))).toMatchObject({ done: 1, total: 3, currentDone: false });
  });
  it("cocher et décocher une période", () => {
    const c = { frequency: "quarterly" as const, since: "2026-07-01", done: ["2026-Q3"] };
    expect(toggleDone(c, "2026-Q4").done).toEqual(["2026-Q3", "2026-Q4"]);
    expect(toggleDone(toggleDone(c, "2026-Q4"), "2026-Q4").done).toEqual(["2026-Q3"]);
    expect(toggleDone(c, "2026-Q3").done).toEqual([]);
  });
});
