"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { PROGRESS_EVENT } from "@/lib/progressEvents";

/** Recharge les données du tableau de bord (progression, guide) quand une étape change d'état. N'affiche rien. */
export default function ProgressRefresher() {
  const router = useRouter();
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 200);
    };
    window.addEventListener(PROGRESS_EVENT, onChange);
    return () => {
      window.removeEventListener(PROGRESS_EVENT, onChange);
      clearTimeout(timer);
    };
  }, [router]);
  return null;
}
