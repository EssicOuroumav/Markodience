#!/usr/bin/env node
// Donne les droits de propriétaire à un compte : rôle « admin » (espace /admin, aucun quota IA)
// et abonnement Agence permanent (tous les onglets, profils illimités, aucune expiration).
// Usage : node --env-file=.env.local scripts/make-owner.mjs vous@exemple.com
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, S = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.argv[2]?.trim().toLowerCase();
if (!U || !S || !email) { console.error("Usage : node --env-file=.env.local scripts/make-owner.mjs <email>"); process.exit(2); }
const H = { apikey: S, Authorization: `Bearer ${S}`, "Content-Type": "application/json" };
const api = async (path, method = "GET", body) => {
  const r = await fetch(U + path, { method, headers: { ...H, Prefer: "resolution=merge-duplicates" }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); return { status: r.status, json: t ? JSON.parse(t) : null };
};
const { json } = await api("/auth/v1/admin/users?per_page=200");
const user = json.users.find((u) => u.email?.toLowerCase() === email);
if (!user) { console.error("Aucun compte avec cet email."); process.exit(1); }
const a = await api(`/auth/v1/admin/users/${user.id}`, "PUT", { app_metadata: { ...(user.app_metadata ?? {}), role: "admin" } });
const b = await api("/rest/v1/subscriptions?on_conflict=user_id", "POST", {
  user_id: user.id, plan: "agence", seats: 2, status: "active", payment_provider: "owner",
  current_period_start: new Date().toISOString().slice(0, 10), current_period_end: null, renewal_date: null,
});
console.log(`rôle admin: ${a.status === 200 ? "ok" : "ÉCHEC " + a.status} | abonnement Agence permanent: ${[200, 201, 204].includes(b.status) ? "ok" : "ÉCHEC " + b.status}`);
console.log("Reconnectez-vous (déconnexion puis connexion) pour que le rôle soit pris en compte.");
