"use client";

import { useRouter } from "next/navigation";
import type { BrandProfile } from "@/types";
import BrandForm from "./BrandForm";

export default function EditBrandForm({ userId, brand }: { userId: string; brand: BrandProfile }) {
  const router = useRouter();
  return <BrandForm userId={userId} brand={brand} submitLabel="Enregistrer les modifications" onCreated={() => { router.push("/dashboard/brands"); router.refresh(); }} />;
}
