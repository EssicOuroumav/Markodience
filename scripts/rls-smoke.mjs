#!/usr/bin/env node
// Test de sécurité rejouable : isolation entre utilisateurs, verrouillage des paliers,
// protection des abonnements et des paiements. Crée 2 comptes jetables et les supprime à la fin.
// Usage : node --env-file=.env.local scripts/rls-smoke.mjs
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, A = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, S = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !A || !S) { console.error("Variables Supabase manquantes."); process.exit(2); }

let pass = 0, fail = 0;
const check = (name, ok, extra = "") => { (ok ? pass++ : fail++); console.log(`${ok ? "✓" : "✗"} ${name}${ok ? "" : "  " + extra}`); };
const hdr = (key, token) => ({ apikey: key, Authorization: `Bearer ${token ?? key}`, "Content-Type": "application/json" });
const call = async (path, { method = "GET", key = A, token, body, raw } = {}) => {
  const r = await fetch(`${U}${path}`, { method, headers: { ...hdr(key, token), ...(raw ? { "Content-Type": raw.type } : {}) }, body: raw ? raw.data : body ? JSON.stringify(body) : undefined });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json };
};
const stamp = Date.now();
const users = [];
async function mkUser(tag) {
  const r = await call("/auth/v1/signup", { method: "POST", body: { email: `smoke.${tag}.${stamp}@example.com`, password: "SmokeTest-12345" } });
  if (!r.json?.access_token) throw new Error("inscription impossible (Confirm email est-il désactivé ?)");
  const u = { id: r.json.user.id, token: r.json.access_token }; users.push(u); return u;
}
const rest = (u, path, opts = {}) => call(`/rest/v1/${path}`, { token: u.token, ...opts });
const admin = (path, opts = {}) => call(path, { key: S, ...opts });

try {
  const a = await mkUser("a"), b = await mkUser("b");

  // Isolation
  const pa = await rest(a, "brand_profiles", { method: "POST", body: { user_id: a.id, name: "A1" } , });
  check("A crée son premier profil", pa.status === 201, pa.status);
  const list = await rest(a, "brand_profiles?select=id,name");
  const aProfile = list.json?.[0]?.id;
  check("B ne voit pas les profils de A", (await rest(b, "brand_profiles?select=id")).json?.length === 0);
  check("B ne peut pas créer un profil au nom de A", (await rest(b, "brand_profiles", { method: "POST", body: { user_id: a.id, name: "X" } })).status === 403);
  check("B ne peut pas lire les piliers de A", (await rest(b, `content_pillars?brand_profile_id=eq.${aProfile}`)).json?.length === 0);
  check("anon ne lit rien", (await call("/rest/v1/brand_profiles?select=id")).status === 401);

  // Palier gratuit
  check("gratuit : 2e profil refusé", (await rest(a, "brand_profiles", { method: "POST", body: { user_id: a.id, name: "A2" } })).status === 403);
  for (const [t, body] of [
    ["kpi_reports", { brand_profile_id: aProfile, month: "2026-10-01", data: {} }],
    ["operational_rules", { brand_profile_id: aProfile, section: "planning", content: "x" }],
    ["editorial_lines", { brand_profile_id: aProfile, channel: "Facebook" }],
    ["live_guides", { brand_profile_id: aProfile, objective: "vente" }],
    ["audits", { brand_profile_id: aProfile, report_data: {} }],
  ]) check(`gratuit : écriture ${t} refusée`, (await rest(a, t, { method: "POST", body })).status === 403);
  check("gratuit : piliers autorisés", (await rest(a, "content_pillars", { method: "POST", body: { brand_profile_id: aProfile, name: "p" } })).status === 201);
  const up = await call(`/storage/v1/object/audits/${aProfile}/x/1.png`, { method: "POST", token: a.token, raw: { type: "image/png", data: Buffer.from("x") } });
  check("gratuit : dépôt dans le bucket audits refusé", up.status >= 400);

  // Abonnements et paiements
  const patch = await rest(a, `subscriptions?user_id=eq.${a.id}`, { method: "PATCH", body: { plan: "agence" } });
  const plan = await call("/rest/v1/rpc/my_plan", { method: "POST", token: a.token, body: {} });
  check("l'utilisateur ne peut pas s'auto-promouvoir", plan.json === "gratuit", `${patch.status} ${plan.json}`);
  check("l'utilisateur ne peut pas forger un paiement", (await rest(a, "payments", { method: "POST", body: { user_id: a.id, plan: "pro", amount: 1, provider: "x", status: "completed" } })).status === 403);
  check("my_plan appelable seulement pour soi (active_plan interdit)", (await call("/rest/v1/rpc/active_plan", { method: "POST", token: a.token, body: { uid: b.id } })).status === 403);

  // Passage en Pro par le serveur
  await admin(`/rest/v1/subscriptions?user_id=eq.${a.id}`, { method: "PATCH", body: { plan: "pro", status: "active", current_period_end: "2099-01-01" } });
  check("pro : écriture kpi_reports autorisée", (await rest(a, "kpi_reports", { method: "POST", body: { brand_profile_id: aProfile, month: "2026-10-01", data: {} } })).status === 201);
  check("pro : 2e et 3e profil autorisés", (await rest(a, "brand_profiles", { method: "POST", body: { user_id: a.id, name: "A2" } })).status === 201 && (await rest(a, "brand_profiles", { method: "POST", body: { user_id: a.id, name: "A3" } })).status === 201);
  check("pro : 4e profil refusé", (await rest(a, "brand_profiles", { method: "POST", body: { user_id: a.id, name: "A4" } })).status === 403);
  check("B (gratuit) reste bloqué", (await rest(b, "operational_rules", { method: "POST", body: { brand_profile_id: aProfile, section: "x", content: "x" } })).status === 403);

  // Expiration
  await admin(`/rest/v1/subscriptions?user_id=eq.${a.id}`, { method: "PATCH", body: { current_period_end: "2020-01-01" } });
  check("pro expiré : retour au palier gratuit", (await call("/rest/v1/rpc/my_plan", { method: "POST", token: a.token, body: {} })).json === "gratuit");
  check("pro expiré : lecture conservée", (await rest(a, "kpi_reports?select=id")).json?.length === 1);
  check("pro expiré : écriture refusée", (await rest(a, "kpi_reports", { method: "POST", body: { brand_profile_id: aProfile, month: "2026-09-01", data: {} } })).status === 403);
} catch (e) {
  fail++; console.error("Erreur :", e.message);
} finally {
  for (const u of users) await admin(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  console.log(`\n${pass} réussis, ${fail} échoués (${users.length} comptes jetables supprimés)`);
  process.exit(fail ? 1 : 0);
}
