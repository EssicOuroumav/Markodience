import { notFound } from "next/navigation";

// Page de paiement factice : développement uniquement.
export default function MockCheckout({ searchParams }: { searchParams: { token?: string } }) {
  if (process.env.PAYMENTS_MOCK !== "1" || process.env.NODE_ENV === "production") notFound();
  const token = encodeURIComponent(searchParams.token ?? "");
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-6 text-center">
      <h1 className="text-[28px]">Paiement factice (développement)</h1>
      <p className="text-ink-secondary">Simule la page de paiement du prestataire.</p>
      <a className="btn-primary" href={`/payment/mock/pay?token=${token}&ok=1`}>Payer</a>
      <a className="btn-secondary" href={`/payment/mock/pay?token=${token}&ok=0`}>Annuler</a>
    </main>
  );
}
