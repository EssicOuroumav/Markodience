import type { CreateInvoiceInput, PaymentProvider, VerifyResult } from "./provider";

// Fournisseur de développement (PAYMENTS_MOCK=1) : l'état « payé » est tenu en mémoire
// du processus. Jamais actif en production (voir getProvider).
type Entry = { amount: number; ref: string; status: VerifyResult["status"] };
// globalThis : en développement, chaque route est compilée séparément et partagerait sinon des instances distinctes.
const g = globalThis as { __mockPayments?: Map<string, Entry> };
const store = (g.__mockPayments ??= new Map<string, Entry>());

export const mockPay = (token: string, ok: boolean) => {
  const e = store.get(token);
  if (e) e.status = ok ? "completed" : "cancelled";
  return e ?? null;
};

export class MockProvider implements PaymentProvider {
  readonly name = "mock";
  async createInvoice(i: CreateInvoiceInput) {
    const token = `mock_${crypto.randomUUID()}`;
    store.set(token, { amount: i.amount, ref: i.ref, status: "pending" });
    return { checkoutUrl: `${new URL(i.returnUrl).origin}/payment/mock?token=${token}`, token };
  }
  async verify(token: string): Promise<VerifyResult> {
    const e = store.get(token);
    if (!e) return { status: "failed", amount: null, ref: null };
    return { status: e.status, amount: e.amount, ref: e.ref };
  }
}
