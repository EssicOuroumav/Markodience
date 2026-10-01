"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { PLANS, isPlanId } from "@/lib/plans";

function Inner() {
  const plan = useSearchParams().get("upgraded");
  if (!isPlanId(plan) || plan === "gratuit") return null;
  return (
    <p role="status" className="mb-6 rounded-btn bg-success/15 px-4 py-3 text-[15px]">
      Paiement confirmé : votre palier {PLANS[plan].label} est actif. Tous vos onglets sont débloqués.
    </p>
  );
}

export default function UpgradeToast() {
  return (<Suspense fallback={null}><Inner /></Suspense>);
}
