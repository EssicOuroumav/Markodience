"use client";

import Link from "next/link";
import { Check, Layers, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BrandLogo from "./BrandLogo";
import { useRouter } from "next/navigation";
import type { BrandProfile } from "@/types";

export function setActiveBrandCookie(id: string) {
  document.cookie = `active_brand=${id}; path=/; max-age=31536000; samesite=lax`;
}

export default function BrandSwitcher({ profiles, activeId, canCreate, variant = "compact" }: { profiles: BrandProfile[]; activeId: string; canCreate: boolean; variant?: "compact" | "sidebar" }) {
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
        className={variant === "sidebar" ? "flex w-full items-center gap-3 rounded-2xl border border-black/10 bg-white px-3 py-2.5 text-left shadow-card transition hover:border-black/20" : "btn-secondary max-w-[200px] gap-2"}
      >
        <BrandLogo src={active.logo_url} name={active.name} color={active.primary_color} size={variant === "sidebar" ? "sm" : "xs"} className="!border-0 !p-0 !shadow-none" />
        {variant === "sidebar" ? (
          <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-semibold leading-tight">{active.name}</span><span className="caption block truncate">{active.sector ?? "Secteur non renseigné"}</span></span>
        ) : (
          <span className="truncate">{active.name}</span>
        )}
        <span aria-hidden className="text-ink-secondary">▾</span>
      </button>
      {open && (
        <div role="listbox" className={`glass-float pop-in absolute z-50 mt-2 w-72 rounded-[20px] p-2 shadow-pop ${variant === "sidebar" ? "left-0 origin-top-left" : "right-0 origin-top-right"}`}>
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              role="option"
              aria-selected={p.id === active.id}
              onClick={() => choose(p.id)}
              className={`flex w-full items-center gap-2 rounded-btn px-3 py-2 text-left text-[15px] hover:bg-black/5 ${p.id === active.id ? "font-semibold" : ""}`}
            >
              <BrandLogo src={p.logo_url} name={p.name} color={p.primary_color} size="xs" className="!border-0 !p-0 !shadow-none" />
              <span className="min-w-0 flex-1"><span className="block truncate">{p.name}</span><span className="caption block truncate">{p.sector ?? "—"}</span></span>
              {p.id === active.id && <Check size={16} className="shrink-0 text-accent" strokeWidth={3} />}
            </button>
          ))}
          <div className="my-1 border-t border-black/5" />
          <Link href="/dashboard/brands" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-btn px-3 py-2 text-[15px] hover:bg-black/5"><Layers size={16} className="text-ink-secondary" />Gérer mes marques</Link>
          {canCreate ? (
            <Link href="/dashboard/brands/new" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-btn px-3 py-2 text-[15px] font-medium text-accent hover:bg-black/5"><Plus size={16} />Ajouter une marque</Link>
          ) : (
            <Link href="/dashboard/upgrade?reason=profiles" onClick={() => setOpen(false)} className="block rounded-btn px-3 py-2 text-[15px] hover:bg-black/5"><span className="text-ink-secondary">Limite de marques atteinte.</span> <span className="text-accent">Passer au palier supérieur</span></Link>
          )}
        </div>
      )}
    </div>
  );
}
