import type { CreateInvoiceInput, InvoiceStatus, PaymentProvider, VerifyResult } from "./provider";

const BASES = {
  sandbox: "https://app.paydunya.com/sandbox-api/v1/checkout-invoice",
  live: "https://app.paydunya.com/api/v1/checkout-invoice",
} as const;

export function paydunyaConfigured(): boolean {
  return !!(process.env.PAYDUNYA_MASTER_KEY && process.env.PAYDUNYA_PRIVATE_KEY && process.env.PAYDUNYA_TOKEN);
}

export class PayDunyaProvider implements PaymentProvider {
  readonly name = "paydunya";
  private base = process.env.PAYDUNYA_MODE === "live" ? BASES.live : BASES.sandbox;

  private headers() {
    return {
      "Content-Type": "application/json",
      "PAYDUNYA-MASTER-KEY": process.env.PAYDUNYA_MASTER_KEY ?? "",
      "PAYDUNYA-PRIVATE-KEY": process.env.PAYDUNYA_PRIVATE_KEY ?? "",
      "PAYDUNYA-TOKEN": process.env.PAYDUNYA_TOKEN ?? "",
    };
  }

  async createInvoice(i: CreateInvoiceInput) {
    const res = await fetch(`${this.base}/create`, {
      method: "POST",
      headers: this.headers(),
      signal: AbortSignal.timeout(20_000),
      body: JSON.stringify({
        invoice: { total_amount: i.amount, description: i.description, customer: i.customer },
        store: { name: "Markodience" },
        custom_data: { ref: i.ref },
        actions: { callback_url: i.callbackUrl, return_url: i.returnUrl, cancel_url: i.cancelUrl },
      }),
    });
    const json = (await res.json().catch(() => null)) as { response_code?: string; response_text?: string; token?: string } | null;
    if (!res.ok || json?.response_code !== "00" || !json.token || !json.response_text) {
      throw new Error("paydunya_create_failed");
    }
    return { checkoutUrl: json.response_text, token: json.token };
  }

  async verify(token: string): Promise<VerifyResult> {
    const res = await fetch(`${this.base}/confirm/${encodeURIComponent(token)}`, {
      headers: this.headers(),
      signal: AbortSignal.timeout(20_000),
    });
    const json = (await res.json().catch(() => null)) as
      | { status?: string; invoice?: { total_amount?: number | string }; custom_data?: { ref?: string } }
      | null;
    if (!res.ok || !json) throw new Error("paydunya_verify_failed");
    const known: InvoiceStatus[] = ["pending", "completed", "cancelled", "failed"];
    const status = known.includes(json.status as InvoiceStatus) ? (json.status as InvoiceStatus) : "pending";
    const amount = json.invoice?.total_amount !== undefined ? Number(json.invoice.total_amount) : null;
    return { status, amount: Number.isFinite(amount) ? amount : null, ref: json.custom_data?.ref ?? null };
  }
}
