import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";

const confirmPayment = vi.fn();
vi.mock("@/lib/payments/confirm", () => ({ confirmPayment: (...a: unknown[]) => confirmPayment(...a) }));

import { POST } from "@/app/api/payments/webhook/route";

const hook = (body: unknown, contentType = "application/json") =>
  POST(new Request("http://x/api/payments/webhook", { method: "POST", headers: { "Content-Type": contentType }, body: typeof body === "string" ? body : JSON.stringify(body) }));

describe("webhook de paiement", () => {
  beforeEach(() => confirmPayment.mockReset());

  it("répond exactement ROK quand le paiement est confirmé (exigé par PayDunya)", async () => {
    confirmPayment.mockResolvedValue({ ok: true, plan: "pro", already: false });
    const res = await hook({ data: { invoice: { token: "tok_1" } } });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("ROK");
    expect(confirmPayment).toHaveBeenCalledWith({ token: "tok_1" });
  });
  it("accepte le format formulaire", async () => {
    confirmPayment.mockResolvedValue({ ok: true, plan: "pro", already: true });
    const res = await hook("data[invoice][token]=tok_2", "application/x-www-form-urlencoded");
    expect(await res.text()).toBe("ROK");
    expect(confirmPayment).toHaveBeenCalledWith({ token: "tok_2" });
  });
  it("répond ROK aussi pour un paiement non abouti (rien à réessayer)", async () => {
    for (const reason of ["not_paid", "cancelled", "unknown_payment", "amount_mismatch"]) {
      confirmPayment.mockResolvedValue({ ok: false, reason });
      expect(await (await hook({ token: "t" })).text()).toBe("ROK");
    }
  });
  it("renvoie 500 pour une erreur transitoire : le prestataire réessaiera", async () => {
    for (const reason of ["error", "not_configured"]) {
      confirmPayment.mockResolvedValue({ ok: false, reason });
      expect((await hook({ token: "t" })).status).toBe(500);
    }
  });
  it("refuse un corps sans jeton ou avec un jeton démesuré", async () => {
    expect((await hook({ rien: 1 })).status).toBe(400);
    expect((await hook({ token: "x".repeat(300) })).status).toBe(400);
    expect(confirmPayment).not.toHaveBeenCalled();
  });
});

describe("migration d'activation des paiements", () => {
  const sql = readFileSync("supabase/migrations/20261001000700_payment_activation.sql", "utf8");
  it("verrouille la ligne du paiement et celle de l'abonnement", () => {
    expect(sql.match(/for update/g)?.length).toBe(2);
  });
  it("change le statut et l'abonnement dans la même fonction (une transaction)", () => {
    expect(sql).toContain("update payments set status = 'completed'");
    expect(sql).toContain("insert into subscriptions");
  });
  it("prolonge l'échéance seulement pour le même palier encore actif", () => {
    expect(sql).toContain("sub.plan = pay.plan and sub.status = 'active'");
    expect(sql).toContain("v_base := sub.current_period_end");
  });
  it("une seule facture en attente par utilisateur", () => {
    expect(sql).toContain("create unique index if not exists payments_one_pending_per_user on payments (user_id) where status = 'pending'");
  });
  it("fonction réservée au backend", () => {
    expect(sql).toContain("revoke all on function public.activate_payment(uuid) from public, anon, authenticated");
    expect(sql).toContain("grant execute on function public.activate_payment(uuid) to service_role");
  });
});
