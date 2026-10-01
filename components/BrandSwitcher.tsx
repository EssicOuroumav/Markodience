"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrandProfile } from "@/types";

export function setActiveBrandCookie(id: string) {
  document.cookie = `active_brand=${id}; path=/; max-age=31536000; samesite=lax`;
}

export default function BrandSwitcher({ profiles, activeId, canCreate }: { profiles: BrandProfile[]; activeId: string; canCreate: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const active = profiles.find((p) => p.id === activeId) ?? profiles[0];

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  function choose(id: string) {
    setActiveBrandCookie(id);
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="btn-secondary max-w-[200px] gap-2"
      >
        <span
          aria-hidden
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: active.primary_color ?? "var(--color-accent)" }}
        />
        <span className="truncate">{active.name}</span>
        <span aria-hidden className="text-ink-secondary">▾</span>
      </button>
      {open && (
        <div role="listbox" className="glass-float absolute right-0 mt-2 w-64 rounded-[18px] p-2 shadow-card-hover">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={p.id === active.id}
              onClick={() => choose(p.id)}
              className={`flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left text-[15px] hover:bg-black/5 ${p.id === active.id ? "font-semibold" : ""}`}
            >
              <span aria-hidden className="h-3 w-3 shrink-0 rounded-full" style={{ background: p.primary_color ?? "var(--color-accent)" }} />
              <span className="truncate">{p.name}</span>
            </button>
          ))}
          <div className="my-1 border-t border-black/5" />
          {canCreate ? (
            <a href="/signup" className="block rounded-btn px-3 py-2 text-[15px] text-accent hover:bg-black/5">
              + Nouveau profil de marque
            </a>
          ) : (
            <Link href="/dashboard/upgrade?reason=profiles" className="block rounded-btn px-3 py-2 text-[15px] hover:bg-black/5">
              <span className="text-ink-secondary">Limite de profils atteinte.</span>{" "}
              <span className="text-accent">Passer au palier supérieur</span>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
