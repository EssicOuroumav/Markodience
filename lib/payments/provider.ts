export type InvoiceStatus = "pending" | "completed" | "cancelled" | "failed";

export type CreateInvoiceInput = {
  amount: number; // XOF
  description: string;
  ref: string; // identifiant interne du paiement
  returnUrl: string;
  cancelUrl: string;
  callbackUrl: string;
  customer?: { name?: string; email?: string; phone?: string };
};

export type VerifyResult = { status: InvoiceStatus; amount: number | null; ref: string | null };

/** Interface commune : changer de prestataire ne touche ni l'UI ni la logique de paliers. */
export interface PaymentProvider {
  readonly name: string;
  createInvoice(input: CreateInvoiceInput): Promise<{ checkoutUrl: string; token: string }>;
  /** Vérifie l'état d'une facture auprès du prestataire (jamais à partir des données reçues du client). */
  verify(token: string): Promise<VerifyResult>;
}
