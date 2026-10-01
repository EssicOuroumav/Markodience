"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Check, Download, KeyRound, ShieldCheck, Trash2, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { DELETE_PHRASE } from "@/lib/account";
import { validatePassword } from "@/lib/password";

type Props = { email: string; fullName: string; phone: string; canDelete: boolean };

function Card({ Icon, title, text, children, tone = "accent" }: { Icon: typeof User; title: string; text?: string; children: React.ReactNode; tone?: "accent" | "danger" }) {
  return (
    <section className={`card-flat ${tone === "danger" ? "!border-danger/25" : ""}`}>
      <div className="flex items-start gap-4">
        <span aria-hidden className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${tone === "danger" ? "bg-danger/12 text-danger" : "bg-accent-soft text-accent"}`}><Icon size={21} strokeWidth={1.8} /></span>
        <div><h2 className="section-title">{title}</h2>{text && <p className="mt-0.5 text-[15px] text-ink-secondary">{text}</p>}</div>
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}

const Msg = ({ ok, text }: { ok: boolean; text: string | null }) =>
  text ? <p role={ok ? "status" : "alert"} className={`mt-4 flex items-center gap-2 rounded-2xl px-4 py-3 text-[15px] ${ok ? "bg-success/12" : "bg-danger/10"}`}>{ok && <Check size={16} strokeWidth={3} className="text-success" />}{text}</p> : null;

export default function AccountSettings({ email, fullName, phone, canDelete }: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [name, setName] = useState(fullName);
  const [tel, setTel] = useState(phone);
  const [profileMsg, setProfileMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwMsg, setPwMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  const [phrase, setPhrase] = useState("");
  const [delPw, setDelPw] = useState("");
  const [delMsg, setDelMsg] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveProfile() {
    setProfileMsg(null);
    if (!name.trim()) return setProfileMsg({ ok: false, text: "Indiquez votre nom." });
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim(), phone: tel.trim() } });
    setSavingProfile(false);
    if (error) return setProfileMsg({ ok: false, text: "Les informations n'ont pas pu être enregistrées." });
    setProfileMsg({ ok: true, text: "Informations enregistrées." });
    router.refresh();
  }

  async function changePassword() {
    setPwMsg(null);
    if (!current) return setPwMsg({ ok: false, text: "Saisissez votre mot de passe actuel." });
    const invalid = validatePassword(next);
    if (invalid) return setPwMsg({ ok: false, text: invalid });
    if (next !== confirm) return setPwMsg({ ok: false, text: "Les deux nouveaux mots de passe ne sont pas identiques." });
    setSavingPw(true);
    const { error: authErr } = await supabase.auth.signInWithPassword({ email, password: current });
    if (authErr) {
      setSavingPw(false);
      return setPwMsg({ ok: false, text: "Le mot de passe actuel est incorrect." });
    }
    const { error } = await supabase.auth.updateUser({ password: next });
    setSavingPw(false);
    if (error) return setPwMsg({ ok: false, text: "Le mot de passe n'a pas pu être modifié." });
    setCurrent(""); setNext(""); setConfirm("");
    setPwMsg({ ok: true, text: "Mot de passe modifié." });
  }

  async function deleteAccount() {
    setDelMsg(null);
    if (phrase.trim() !== DELETE_PHRASE) return setDelMsg(`Tapez « ${DELETE_PHRASE} » pour confirmer.`);
    if (!delPw) return setDelMsg("Saisissez votre mot de passe.");
    if (!window.confirm("Dernière confirmation : toutes vos marques et leurs données seront effacées définitivement. Continuer ?")) return;
    setDeleting(true);
    const res = await fetch("/api/account/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: delPw, confirm: phrase }) });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.ok) {
      setDeleting(false);
      return setDelMsg(json?.error ?? "La suppression a échoué.");
    }
    await supabase.auth.signOut().catch(() => undefined);
    router.push("/?compte=supprime");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card Icon={User} title="Vos informations" text="Ces informations ne sont visibles que de vous.">
        <div className="grid gap-5 sm:grid-cols-2">
          <div><label className="label" htmlFor="acc-name">Nom complet</label><input id="acc-name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" /></div>
          <div><label className="label" htmlFor="acc-tel">Téléphone</label><input id="acc-tel" type="tel" className="input" value={tel} onChange={(e) => setTel(e.target.value)} autoComplete="tel" /></div>
          <div className="sm:col-span-2"><label className="label" htmlFor="acc-email">Adresse e-mail</label><input id="acc-email" className="input !bg-canvas !text-ink-secondary" value={email} readOnly aria-describedby="acc-email-help" /><p id="acc-email-help" className="caption mt-1.5">Pour changer d&apos;adresse e-mail, contactez-nous.</p></div>
        </div>
        <Msg ok={!!profileMsg?.ok} text={profileMsg?.text ?? null} />
        <button type="button" className="btn-primary mt-6" onClick={saveProfile} disabled={savingProfile}>{savingProfile ? "Enregistrement…" : "Enregistrer"}</button>
      </Card>

      <Card Icon={KeyRound} title="Mot de passe" text="Choisissez un mot de passe d'au moins 8 caractères, avec une lettre et un chiffre.">
        <div className="grid gap-5 sm:grid-cols-3">
          <div><label className="label" htmlFor="pw-cur">Mot de passe actuel</label><input id="pw-cur" type="password" className="input" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" /></div>
          <div><label className="label" htmlFor="pw-new">Nouveau mot de passe</label><input id="pw-new" type="password" className="input" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" /></div>
          <div><label className="label" htmlFor="pw-conf">Confirmation</label><input id="pw-conf" type="password" className="input" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" /></div>
        </div>
        <Msg ok={!!pwMsg?.ok} text={pwMsg?.text ?? null} />
        <button type="button" className="btn-primary mt-6" onClick={changePassword} disabled={savingPw}>{savingPw ? "Modification…" : "Modifier le mot de passe"}</button>
      </Card>

      <Card Icon={ShieldCheck} title="Vos données" text="Vous gardez le contrôle de tout ce que vous avez saisi dans Markodience.">
        <p className="max-w-2xl text-[15px] text-ink-secondary">Téléchargez une copie complète de vos données (compte, marques, identités, piliers, lignes éditoriales, audits, rapports, paiements) dans un fichier lisible. Consultez aussi notre <a href="/confidentialite" className="text-accent underline">politique de confidentialité</a>.</p>
        <a href="/api/account/export" className="btn-secondary mt-5"><Download size={17} />Télécharger mes données</a>
      </Card>

      <Card Icon={AlertTriangle} tone="danger" title="Supprimer mon compte" text="Cette action est définitive.">
        {canDelete ? (
          <>
            <p className="max-w-2xl text-[15px] text-ink-secondary">Votre compte, toutes vos marques et leurs données (identités, piliers, lignes éditoriales, audits, rapports, fichiers et logos) seront effacés définitivement. Un abonnement en cours ne sera pas remboursé. Pensez à télécharger vos données avant.</p>
            <div className="mt-5 grid gap-5 sm:grid-cols-2">
              <div><label className="label" htmlFor="del-phrase">Tapez {DELETE_PHRASE} pour confirmer</label><input id="del-phrase" className="input" value={phrase} onChange={(e) => setPhrase(e.target.value)} autoComplete="off" /></div>
              <div><label className="label" htmlFor="del-pw">Votre mot de passe</label><input id="del-pw" type="password" className="input" value={delPw} onChange={(e) => setDelPw(e.target.value)} autoComplete="current-password" /></div>
            </div>
            {delMsg && <p role="alert" className="mt-4 rounded-2xl bg-danger/10 px-4 py-3 text-[15px]">{delMsg}</p>}
            <button type="button" onClick={deleteAccount} disabled={deleting} className="mt-6 inline-flex items-center gap-2 rounded-pill bg-danger px-6 py-3 text-[16px] font-medium text-white transition hover:brightness-95 disabled:opacity-50"><Trash2 size={17} />{deleting ? "Suppression…" : "Supprimer définitivement mon compte"}</button>
          </>
        ) : (
          <p className="text-[15px] text-ink-secondary">Le compte propriétaire ne peut pas être supprimé depuis cette page.</p>
        )}
      </Card>
    </div>
  );
}
