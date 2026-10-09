import { describe, expect, it } from "vitest";
import { withHeartbeat } from "./stream";

const later = <T,>(ms: number, value: T) => new Promise<T>((resolve) => setTimeout(() => resolve(value), ms));
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

describe("withHeartbeat", () => {
  it("renvoie telle quelle une réponse rapide, statut compris", async () => {
    const res = await withHeartbeat(later(5, json(404, { ok: false, code: "not_found" })), { graceMs: 100, intervalMs: 10 });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ ok: false, code: "not_found" });
  });
  it("une réponse lente est envoyée en flux avec des espaces de maintien, puis le JSON", async () => {
    const res = await withHeartbeat(later(120, json(200, { ok: true, data: { id: "a" } })), { graceMs: 20, intervalMs: 15 });
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text.startsWith(" ")).toBe(true);
    expect(JSON.parse(text)).toEqual({ ok: true, data: { id: "a" } });
  });
  it("le premier octet part tout de suite après le délai de grâce (les en-têtes ne partent qu'avec lui)", async () => {
    const res = await withHeartbeat(later(400, json(200, { ok: true })), { graceMs: 20, intervalMs: 300 });
    const reader = res.body!.getReader();
    const t0 = Date.now();
    const first = await reader.read();
    expect(Date.now() - t0).toBeLessThan(100);
    expect(new TextDecoder().decode(first.value)).toBe(" ");
    reader.cancel();
  });
  it("une erreur lente arrive dans le corps (ok false) et le client peut la lire", async () => {
    const res = await withHeartbeat(later(80, json(502, { ok: false, code: "credits", error: "Crédit épuisé" })), { graceMs: 10, intervalMs: 10 });
    expect(res.status).toBe(200);
    expect(JSON.parse(await res.text())).toMatchObject({ ok: false, code: "credits", error: "Crédit épuisé" });
  });
  it("un travail qui plante renvoie un message d'échec lisible, rapide ou lent", async () => {
    const slow = await withHeartbeat(new Promise<Response>((_, reject) => setTimeout(() => reject(new Error("boom")), 60)), { graceMs: 10, intervalMs: 10 });
    expect(JSON.parse(await slow.text())).toMatchObject({ ok: false, code: "unknown" });
  });
});
