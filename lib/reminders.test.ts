import { describe, expect, it } from "vitest";
import { buildReminders, DEFAULT_PREFS, renderReminderEmail, type BrandFacts } from "./reminders";
import { sendMail } from "./mail";

const brand = (o: Partial<BrandFacts> = {}): BrandFacts => ({ name: "ONG Test", kpiDeadlineDay: 5, kpiPreviousSubmitted: false, kpiAvailable: true, postsToday: 0, postsTomorrow: 0, postsAvailable: true, ...o });
const at = (iso: string) => new Date(iso + "T08:00:00Z");

describe("rappels", () => {
  it("KPI : 2 jours avant, le jour même, 1 jour après l'échéance, jamais en dehors", () => {
    const f = (d: string) => buildReminders({ brands: [brand()], billing: null }, DEFAULT_PREFS, at(d)).filter((i) => i.kind === "kpi");
    expect(f("2026-11-03")[0].text).toContain("dans 2 jours");
    expect(f("2026-11-05")[0].text).toContain("aujourd'hui");
    expect(f("2026-11-06")[0].text).toContain("en retard");
    expect(f("2026-11-04")).toHaveLength(0);
    expect(f("2026-11-10")).toHaveLength(0);
    expect(f("2026-11-01")).toHaveLength(0);
  });
  it("KPI : rien si le rapport est rendu ou si le palier n'inclut pas le suivi", () => {
    const d = at("2026-11-05");
    expect(buildReminders({ brands: [brand({ kpiPreviousSubmitted: true })], billing: null }, DEFAULT_PREFS, d)).toHaveLength(0);
    expect(buildReminders({ brands: [brand({ kpiAvailable: false })], billing: null }, DEFAULT_PREFS, d)).toHaveLength(0);
  });
  it("fonctionne au passage d'une année", () => {
    const r = buildReminders({ brands: [brand()], billing: null }, DEFAULT_PREFS, at("2027-01-05"));
    expect(r).toHaveLength(1);
  });
  it("publications : aujourd'hui et demain, avec accord du pluriel", () => {
    const r = buildReminders({ brands: [brand({ postsToday: 1, postsTomorrow: 3, kpiPreviousSubmitted: true })], billing: null }, DEFAULT_PREFS, at("2026-10-20"));
    expect(r.map((i) => i.text)).toEqual(["ONG Test : 1 publication à publier aujourd'hui.", "ONG Test : 3 publications prévues demain."]);
  });
  it("abonnement : à 7, 3 et 1 jours de la fin", () => {
    const f = (d: string) => buildReminders({ brands: [], billing: { plan: "Pro", periodEnd: "2026-10-30T00:00:00Z" } }, DEFAULT_PREFS, at(d));
    expect(f("2026-10-23")).toHaveLength(1);
    expect(f("2026-10-27")).toHaveLength(1);
    expect(f("2026-10-29")[0].text).toContain("demain");
    expect(f("2026-10-25")).toHaveLength(0);
    expect(f("2026-10-30")).toHaveLength(0);
  });
  it("respecte les préférences", () => {
    const facts = { brands: [brand({ postsToday: 2 })], billing: null };
    expect(buildReminders(facts, { ...DEFAULT_PREFS, email_enabled: false }, at("2026-11-05"))).toHaveLength(0);
    expect(buildReminders(facts, { ...DEFAULT_PREFS, kpi: false }, at("2026-11-05")).every((i) => i.kind === "posts")).toBe(true);
    expect(buildReminders(facts, { ...DEFAULT_PREFS, posts: false }, at("2026-11-05")).every((i) => i.kind === "kpi")).toBe(true);
  });
  it("échappe le contenu saisi par l'utilisateur dans le message", () => {
    const m = renderReminderEmail([{ kind: "posts", href: "/dashboard/posts", text: '<img src=x onerror="alert(1)"> & Cie' }], "https://exemple.org/");
    expect(m.html).not.toContain("<img");
    expect(m.html).toContain("&lt;img");
    expect(m.html).toContain("https://exemple.org/dashboard/posts");
    expect(m.text).toContain("https://exemple.org/dashboard/account");
    expect(m.subject).toBe("Markodience : 1 rappel pour vous");
  });
});

describe("envoi d'e-mail", () => {
  it("n'envoie rien sans configuration", async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendMail("a@b.c", { subject: "s", text: "t", html: "h" }, (async () => { throw new Error("ne doit pas être appelé"); }) as never)).toEqual({ ok: false, reason: "not_configured" });
  });
  it("signale un échec du prestataire et une panne réseau", async () => {
    process.env.RESEND_API_KEY = "k"; process.env.MAIL_FROM = "Markodience <a@b.c>";
    expect(await sendMail("a@b.c", { subject: "s", text: "t", html: "h" }, (async () => ({ ok: false })) as never)).toEqual({ ok: false, reason: "failed" });
    expect(await sendMail("a@b.c", { subject: "s", text: "t", html: "h" }, (async () => { throw new Error("x"); }) as never)).toEqual({ ok: false, reason: "failed" });
    expect(await sendMail("a@b.c", { subject: "s", text: "t", html: "h" }, (async () => ({ ok: true })) as never)).toEqual({ ok: true });
    delete process.env.RESEND_API_KEY; delete process.env.MAIL_FROM;
  });
});
