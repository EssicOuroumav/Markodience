"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Compass } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Rétablit le guide d'avancement masqué pour cette marque. */
export default function JourneyRestore({ brandId, dismissed }: { brandId: string; dismissed: string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function restore() {
    setBusy(true);
    await createClient().auth.updateUser({ data: { journey_dismissed: dismissed.filter((id) => id !== brandId) } });
    router.refresh();
    setBusy(false);
  }
  return (
    <button type="button" className="btn-ghost" disabled={busy} onClick={restore}><Compass size={17} />Reprendre le parcours guidé</button>
  );
}
