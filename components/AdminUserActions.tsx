"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";

type Props = { userId: string; plan: string; banned: boolean; isSelf: boolean };

export default function AdminUserActions({ userId, plan, banned, isSelf }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [target, setTarget] = useState(plan);
  const [months, setMonths] = useState("1");
  const [seats, setSeats] = useState("2");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function send(body: object, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/admin/action", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ user_id: userId, ...body }) });
    const json = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok || !json?.ok) return setMsg(json?.error ?? "L'action a échoué.");
    setMsg("Fait");
    router.refresh();
  }

  return (
    <div>
      <button type="button" className="btn-secondary !px-3 !py-1.5 !text-[14px]" onClick={() => setOpen((v) => !v)} aria-expanded={open}>Gérer</button>
      {open && (
        <div className="mt-3 w-72 space-y-3 rounded-2xl border border-[var(--color-border-soft)] bg-white p-4 text-left shadow-pop">
          <div className="grid grid-cols-2 gap-2">
            <label className="caption">Palier
              <select className="input !mt-1 !px-3 !py-2 !text-[14px]" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="gratuit">Gratuit</option><option value="pro">Pro</option><option value="agence">Agence</option>
              </select>
            </label>
            <label className="caption">Durée
              <select className="input !mt-1 !px-3 !py-2 !text-[14px]" value={months} onChange={(e) => setMonths(e.target.value)} disabled={target === "gratuit"}>
                <option value="1">1 mois</option><option value="3">3 mois</option><option value="12">12 mois</option><option value="0">Permanent</option>
              </select>
            </label>
          </div>
          {target === "agence" && (
            <label className="caption block">Sièges
              <input type="number" min={2} max={50} className="input !mt-1 !px-3 !py-2 !text-[14px]" value={seats} onChange={(e) => setSeats(e.target.value)} />
            </label>
          )}
          <button type="button" className="btn-primary !w-full !py-2 !text-[15px]" disabled={busy}
            onClick={() => send({ action: "set_plan", plan: target, months: target === "gratuit" || months === "0" ? null : Number(months), seats: Number(seats) }, `Appliquer le palier « ${target} » à ce compte ?`)}>
            Appliquer le palier
          </button>
          <div className="flex flex-wrap gap-2 border-t border-[var(--color-border-soft)] pt-3">
            <button type="button" className="btn-secondary !px-3 !py-1.5 !text-[13px]" disabled={busy} onClick={() => send({ action: "reset_quota" })}>Remettre le quota à zéro</button>
            {!isSelf && (
              <button type="button" className="btn-secondary !px-3 !py-1.5 !text-[13px]" disabled={busy}
                onClick={() => send({ action: banned ? "unsuspend" : "suspend" }, banned ? "Réactiver ce compte ?" : "Suspendre ce compte ? L'utilisateur ne pourra plus se connecter.")}>
                {banned ? "Réactiver" : "Suspendre"}
              </button>
            )}
          </div>
          {msg && <p role="status" className="caption flex items-center gap-1">{msg === "Fait" && <Check size={14} strokeWidth={3} className="text-success" aria-hidden />}{msg}</p>}
        </div>
      )}
    </div>
  );
}
