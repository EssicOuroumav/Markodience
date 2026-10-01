"use client";

import { useRouter } from "next/navigation";
import BrandForm from "./BrandForm";

export default function NewBrandForm({ userId }: { userId: string }) {
  const router = useRouter();
  return (
    <BrandForm
      userId={userId}
      submitLabel="Créer la marque"
      onCreated={() => { router.push("/dashboard"); router.refresh(); }}
      onLimit={() => router.push("/dashboard/upgrade?reason=profiles")}
    />
  );
}
