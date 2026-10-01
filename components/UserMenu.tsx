"use client";

import Link from "next/link";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserMenu({ email, owner }: { email: string; owner: boolean }) {
  const router = useRouter();
  async function logout() {
    await createClient().auth.signOut();
    router.push("/login");
    router.refresh();
  }
  const initial = email.slice(0, 1).toUpperCase();
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-[var(--color-border-soft)] bg-white p-2.5 shadow-card">
      <Link href="/dashboard/account" className="flex min-w-0 flex-1 items-center gap-3 rounded-xl outline-offset-2 transition hover:opacity-80" aria-label="Mon compte">
        <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-[15px] font-semibold text-white">{initial}</span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[14px] font-medium" title={email}>{email}</span>
          <span className="caption block">{owner ? "Propriétaire" : "Mon compte"}</span>
        </span>
      </Link>
      <button type="button" onClick={logout} aria-label="Se déconnecter" title="Se déconnecter" className="rounded-btn p-2 text-ink-secondary transition hover:bg-black/5 hover:text-ink">
        <LogOut size={18} />
      </button>
    </div>
  );
}
