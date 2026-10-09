import { describe, expect, it, vi } from "vitest";
import { callGenerate, type JobSnapshot } from "./api";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const accepted = () => json(202, { ok: true, job: { id: "x", status: "running" } });
const noSleep = async () => {};
const ID = "11111111-1111-4111-8111-111111111111";
const base = { sleep: noSleep, newId: () => ID };
const bodyOf = (call: unknown[]) => JSON.parse((call[1] as RequestInit).body as string);

describe("callGenerate : demande en arrière-plan", () => {
  it("envoie la demande avec son identifiant, puis consulte jusqu'au résultat", async () => {
    const fetchImpl = vi.fn(async () => accepted());
    const states: JobSnapshot[] = [null, { status: "running", result: null }, { status: "done", result: { ok: true, data: { id: "a" } } }];
    const poll = vi.fn(async () => states.shift() ?? null);
    const res = await callGenerate({ type: "pillars", brand_profile_id: "b" }, { ...base, fetchImpl: fetchImpl as never, poll });
    expect(res).toEqual({ ok: true, data: { id: "a" } });
    expect(poll).toHaveBeenCalledTimes(3);
    expect(bodyOf(fetchImpl.mock.calls[0])).toEqual({ type: "pillars", brand_profile_id: "b", request_id: ID });
  });

  it("une coupure à l'envoi est rejouée avec la MÊME demande (pas de double travail)", async () => {
    let n = 0;
    const fetchImpl = vi.fn(async () => { if (n++ === 0) throw new TypeError("Failed to fetch"); return accepted(); });
    const poll = vi.fn(async (): Promise<JobSnapshot> => ({ status: "done", result: { ok: true, data: 1 } }));
    const res = await callGenerate({ type: "tone" }, { ...base, fetchImpl: fetchImpl as never, poll });
    expect(res.ok).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(bodyOf(fetchImpl.mock.calls[0]).request_id).toBe(bodyOf(fetchImpl.mock.calls[1]).request_id);
  });

  it("une erreur de passerelle (502, 504) est rejouée", async () => {
    const answers = [json(502, "bad"), json(504, "bad"), accepted()];
    const fetchImpl = vi.fn(async () => answers.shift()!);
    const res = await callGenerate({ type: "tone" }, { ...base, fetchImpl: fetchImpl as never, poll: async () => ({ status: "done", result: { ok: true, data: 2 } }) });
    expect(res).toEqual({ ok: true, data: 2 });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("si l'envoi échoue à chaque essai, message de connexion", async () => {
    const fetchImpl = vi.fn(async () => { throw new TypeError("Failed to fetch"); });
    const res = await callGenerate({ type: "tone" }, { ...base, fetchImpl: fetchImpl as never, poll: async () => null });
    expect(res).toMatchObject({ ok: false, network: true });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
  });

  it("un refus immédiat (palier, quota, données) est renvoyé tel quel, sans consultation", async () => {
    const poll = vi.fn();
    const fetchImpl = vi.fn(async () => json(429, { ok: false, code: "quota", error: "Limite atteinte" }));
    const res = await callGenerate({ type: "tone" }, { ...base, fetchImpl: fetchImpl as never, poll });
    expect(res).toEqual({ ok: false, error: "Limite atteinte" });
    expect(poll).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("une erreur du travail (crédit épuisé…) arrive avec son message", async () => {
    const res = await callGenerate({ type: "tone" }, { ...base, fetchImpl: (async () => accepted()) as never, poll: async () => ({ status: "error", result: { ok: false, code: "credits", error: "Crédit épuisé" } }) });
    expect(res).toEqual({ ok: false, error: "Crédit épuisé" });
  });

  it("une coupure pendant la consultation est sans conséquence", async () => {
    let n = 0;
    const poll = async (): Promise<JobSnapshot> => { n++; if (n < 3) throw new Error("réseau"); return { status: "done", result: { ok: true, data: 3 } }; };
    const res = await callGenerate({ type: "tone" }, { ...base, fetchImpl: (async () => accepted()) as never, poll });
    expect(res).toEqual({ ok: true, data: 3 });
    expect(n).toBe(3);
  });

  it("au bout du délai, invite à recharger la page (le résultat est enregistré côté serveur)", async () => {
    let t = 0;
    const res = await callGenerate({ type: "tone" }, { ...base, fetchImpl: (async () => accepted()) as never, poll: async () => ({ status: "running", result: null }), now: () => (t += 60_000) });
    expect(res).toMatchObject({ ok: false, network: true });
    expect((res as { error: string }).error).toContain("Rechargez la page");
  });

  it("un résultat illisible donne un message d'échec, jamais une exception", async () => {
    const res = await callGenerate({ type: "tone" }, { ...base, fetchImpl: (async () => accepted()) as never, poll: async () => ({ status: "done", result: null }) });
    expect(res).toEqual({ ok: false, error: "La génération a échoué. Réessayez." });
  });
});
