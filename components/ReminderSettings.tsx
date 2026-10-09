"use client";

import { BellRing } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { ReminderPrefs } from "@/lib/reminders";
import SaveIndicator, { type SaveState } from "./SaveIndicator";

const OPTIONS: { key: "kpi" | "posts" | "billing"; label: string; hint: string }[] = [
  { key: "kpi", label: "Rapport KPI à rendre", hint: "2 jours avant l'échéance, le jour même et le lendemain si le rapport du mois dernier manque." },
  { key: "posts", label: "Publications à publier", hint: "Le jour même et la veille, pour les publications du calendrier qui ne sont pas encore publiées." },
  { key: "billing", label: "Fin d'abonnement", hint: "7, 3 et 1 jour avant la fin de votre palier payant." },
];

/** Choix des rappels par e-mail (au plus un message par jour). */
export default function ReminderSettings({ userId, initial }: { userId: string; initial: ReminderPrefs }) {
  const [prefs, setPrefs] = useState<ReminderPrefs>(initial);
  const [save, setSave] = useState<SaveState>("idle");

  async function update(patch: Partial<ReminderPrefs>) {
    const next = { ...prefs, ...patch };
    setPrefs(next);
    setSave("saving");
    const { error } = await createClient().from("reminder_prefs").upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() }, { onConflict: "user_id" });
    setSave(error ? "error" : "saved");
  }

  return (
    <section id="rappels" className="card-flat">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3"><span aria-hidden className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent"><BellRing size={19} strokeWidth={1.8} /></span><h2 className="section-title">Rappels par e-mail</h2></div>
        <SaveIndicator state={save} />
      </div>
      <p className="mt-2 text-[15px] text-ink-secondary">Au plus un e-mail par jour, seulement quand quelque chose vous attend.</p>
      <label className="mt-4 flex items-center gap-3 text-[16px] font-medium">
        <input type="checkbox" className="h-5 w-5 accent-[var(--color-accent)]" checked={prefs.email_enabled} onChange={(e) => update({ email_enabled: e.target.checked })} />
        Recevoir les rappels par e-mail
      </label>
      <ul className="mt-3 space-y-3">
        {OPTIONS.map((o) => (
          <li key={o.key} className={prefs.email_enabled ? "" : "opacity-50"}>
            <label className="flex items-start gap-3">
              <input type="checkbox" className="mt-1 h-5 w-5 accent-[var(--color-accent)]" disabled={!prefs.email_enabled} checked={prefs[o.key]} onChange={(e) => update({ [o.key]: e.target.checked })} />
              <span><span className="block text-[15px] font-medium">{o.label}</span><span className="caption">{o.hint}</span></span>
            </label>
          </li>
        ))}
      </ul>
    </section>
  );
}
