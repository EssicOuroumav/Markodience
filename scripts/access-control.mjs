#!/usr/bin/env node
// Attaque simulée des contrôles d'accès (OWASP : Broken Access Control, BOLA/IDOR, BFLA) sur une application EN MARCHE.
// Crée des comptes jetables (A propriétaire des données, B attaquant, D administrateur) et les supprime à la fin.
// Usage : npm run build && npx next start -p 3015   puis   BASE_URL=http://localhost:3015 node --env-file=.env.local scripts/access-control.mjs
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, A_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, S = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE_URL || "http://localhost:3015";
if (!U || !A_KEY || !S) { console.error("Variables Supabase manquantes."); process.exit(2); }
const ref = new URL(U).hostname.split(".")[0];
let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "✓" : "✗"} ${n}${ok ? "" : "  " + x}`); };
const J = { "Content-Type": "application/json" };
const sb = async (path, { method = "GET", key = S, token, body, raw } = {}) => {
  const r = await fetch(U + path, { method, headers: { apikey: key, Authorization: "Bearer " + (token ?? key), ...(raw ? { "Content-Type": raw.type } : J) }, body: raw ? raw.data : body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j = null; try { j = JSON.parse(t); } catch {}
  return { s: r.status, j, t };
};
const stamp = Date.now(), made = [], files = [];
async function mk(tag, appMeta) {
  const email = `ac.${tag}.${stamp}@example.com`, password = "AccessTest-12345";
  const c = await sb("/auth/v1/admin/users", { method: "POST", body: { email, password, email_confirm: true, user_metadata: { full_name: `Test ${tag}` }, ...(appMeta ? { app_metadata: appMeta } : {}) } });
  const t = await sb("/auth/v1/token?grant_type=password", { method: "POST", key: A_KEY, body: { email, password } });
  const session = t.j; const val = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = `sb-${ref}-auth-token`, parts = []; for (let i = 0; i < val.length; i += 3180) parts.push(val.slice(i, i + 3180));
  const cookie = parts.length === 1 ? `${name}=${val}` : parts.map((p, i) => `${name}.${i}=${p}`).join("; ");
  const u = { id: c.j.id, token: session.access_token, cookie }; made.push(u); return u;
}
const web = (u, path, init = {}) => fetch(BASE + path, { redirect: "manual", ...init, headers: { ...(init.headers || {}), ...(u ? { cookie: u.cookie } : {}) } });
const api = (u, path, body) => web(u, path, { method: "POST", headers: J, body: JSON.stringify(body) }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => null) }));
// /api/generate répond 202 puis travaille en arrière-plan : on suit la demande (table ai_jobs, clé service) jusqu'à son résultat.
// Les refus immédiats (401, 403, 429…) arrivent directement ; les refus du travail (404 objet introuvable…) dans le résultat.
async function gen(u, body) {
  const r = await api(u, "/api/generate", { ...body, request_id: crypto.randomUUID() });
  if (r.s !== 202 || !r.j?.job) return r;
  for (let i = 0; i < 60; i++) {
    await new Promise((res) => setTimeout(res, 1000));
    const job = (await sb(`/rest/v1/ai_jobs?id=eq.${r.j.job.id}&select=status,result,http_status`)).j?.[0];
    if (job && job.status !== "running") return { s: job.http_status, j: job.result };
  }
  return { s: 0, j: { error: "délai dépassé" } };
}
const SECRET = `ALPHA-SECRET-${stamp}`;
try {
  const a = await mk("a"), b = await mk("b"), d = await mk("d", { role: "admin" });
  // Données de A : marque, ligne éditoriale + entrée, audit, fichier privé, logo
  const brand = (await sb("/rest/v1/brand_profiles", { method: "POST", body: { user_id: a.id, name: SECRET, sector: "Autre", primary_color: "#112233" }, }).then(async () => sb(`/rest/v1/brand_profiles?user_id=eq.${a.id}&select=id`))).j[0].id;
  await sb(`/rest/v1/subscriptions?user_id=eq.${a.id}`, { method: "PATCH", body: { plan: "pro", status: "active", current_period_end: "2099-01-01" } });
  const lineId = crypto.randomUUID(), entryId = crypto.randomUUID(), auditId = crypto.randomUUID(), guideId = crypto.randomUUID();
  await sb("/rest/v1/editorial_lines", { method: "POST", body: { id: lineId, brand_profile_id: brand, channel: "Facebook" } });
  await sb("/rest/v1/editorial_entries", { method: "POST", body: { id: entryId, editorial_line_id: lineId, week_number: 1, theme: SECRET } });
  await sb("/rest/v1/audits", { method: "POST", body: { id: auditId, brand_profile_id: brand, report_data: { secret: SECRET } } });
  await sb("/rest/v1/live_guides", { method: "POST", body: { id: guideId, brand_profile_id: brand, objective: "vente" } });
  const png = Buffer.from("89504e470d0a1a0a", "hex"), auditFile = `${brand}/${auditId}/f.png`, logoA = `${a.id}/logo.png`;
  await sb(`/storage/v1/object/audits/${auditFile}`, { method: "POST", raw: { type: "image/png", data: png } }); files.push(["audits", auditFile]);
  await sb(`/storage/v1/object/logos/${logoA}`, { method: "POST", raw: { type: "image/png", data: png } }); files.push(["logos", logoA]);

  console.log("\n— Témoins : l'accès légitime fonctionne —");
  const own = await (await web(a, `/dashboard/brands/${brand}`)).text();
  check("A voit sa propre marque", own.includes(SECRET));

  console.log("\n— BOLA / IDOR : B tente d'atteindre les objets de A —");
  const other = await web(b, `/dashboard/brands/${brand}`); const otherHtml = await other.text();
  check("page de modification de la marque de A : rien n'est révélé", !otherHtml.includes(SECRET), `status ${other.status}`);
  for (const [name, body] of [
    ["identité", { type: "identity", brand_profile_id: brand, questionnaire: { brand_name: "x", offer: "x", segments: ["x"], problem: "x", differentiation: "x", personality: ["a", "b", "c"], goal: "notoriete", channels: ["Facebook"] } }],
    ["piliers", { type: "pillars", brand_profile_id: brand }],
    ["tonalité", { type: "tone", brand_profile_id: brand }],
    ["cibles", { type: "personas", brand_profile_id: brand }],
    ["communauté", { type: "community", brand_profile_id: brand }],
    ["assistant", { type: "assistant", brand_profile_id: brand, task: "analyse", input: "" }],
    ["idées", { type: "ideas", brand_profile_id: brand, pillar_id: crypto.randomUUID(), count: 3 }],
    ["ligne éditoriale", { type: "editorial_line", editorial_line_id: lineId }],
    ["semaine éditoriale", { type: "editorial_week", entry_id: entryId }],
    ["guide de live", { type: "live_scripts", live_guide_id: guideId }],
    ["audit", { type: "audit", brand_profile_id: brand, audit_id: crypto.randomUUID(), files: [auditFile] }],
  ]) {
    const r = await gen(b, body);
    check(`/api/generate ${name} sur l'objet de A : refusé (404 ou 403)`, r.s === 404 || r.s === 403, `${r.s} ${JSON.stringify(r.j)}`);
  }
  const v = await api(b, "/api/editorial/validation", { entry_id: entryId, action: "validate" });
  check("validation d'une entrée éditoriale de A : refusée", v.s === 404 || v.s === 403, `${v.s}`);
  check("l'entrée de A n'a pas été modifiée", (await sb(`/rest/v1/editorial_entries?id=eq.${entryId}&select=validation_status`)).j?.[0]?.validation_status !== "valide");
  const exp = await (await web(b, "/api/account/export")).text();
  check("l'export de B ne contient aucune donnée de A", !exp.includes(SECRET) && !exp.includes(a.id));
  check("fichier privé de A (audits) illisible pour B", (await sb(`/storage/v1/object/authenticated/audits/${auditFile}`, { token: b.token, key: A_KEY })).s >= 400);
  check("B ne peut pas déposer dans le dossier de A (logos)", (await sb(`/storage/v1/object/logos/${a.id}/hack.png`, { method: "POST", token: b.token, key: A_KEY, raw: { type: "image/png", data: png } })).s >= 400);
  check("B ne peut pas écraser le logo de A", (await sb(`/storage/v1/object/logos/${logoA}`, { method: "PUT", token: b.token, key: A_KEY, raw: { type: "image/png", data: Buffer.from("x") } })).s >= 400);
  await sb(`/storage/v1/object/logos/${logoA}`, { method: "DELETE", token: b.token, key: A_KEY });
  const still = await sb(`/storage/v1/object/info/logos/${logoA}`);
  check("le logo de A existe toujours après les attaques (écrasement et suppression par B inopérants)", still.s === 200, `${still.s}`);
  const cookieSwap = await (await web(b, "/dashboard", { headers: { cookie: `${b.cookie}; active_brand=${brand}` } })).text();
  check("cookie « marque active » pointant vers la marque de A : ignoré", !cookieSwap.includes(SECRET));

  console.log("\n— BFLA : B (non-administrateur) tente des fonctions réservées —");
  for (const act of [{ action: "set_plan", user_id: b.id, plan: "agence", months: 12, seats: 2 }, { action: "reset_quota", user_id: a.id }, { action: "suspend", user_id: a.id }]) {
    const r = await api(b, "/api/admin/action", act);
    check(`/api/admin/action ${act.action} : refusé (404)`, r.s === 404, `${r.s}`);
  }
  check("B est toujours au palier gratuit", (await sb("/rest/v1/rpc/active_plan", { method: "POST", body: { uid: b.id } })).j === "gratuit");
  for (const p of ["/admin", "/admin/users", "/admin/payments"]) { const r = await web(b, p); check(`${p} : 404 pour un non-administrateur`, r.status === 404, `${r.status}`); }
  const meta = await sb(`/auth/v1/user`, { token: b.token, key: A_KEY, method: "PUT", body: { data: { role: "admin" }, app_metadata: { role: "admin" } } });
  check("B ne peut pas s'attribuer le rôle admin (métadonnées)", (await sb(`/auth/v1/user`, { token: b.token, key: A_KEY })).j?.app_metadata?.role !== "admin");
  for (const [name, body] of [["audit", (() => { const bid = crypto.randomUUID(), aid = crypto.randomUUID(); return { type: "audit", brand_profile_id: bid, audit_id: aid, files: [`${bid}/${aid}/f.png`] }; })()], ["ligne éditoriale", { type: "editorial_line", editorial_line_id: crypto.randomUUID() }], ["live", { type: "live_scripts", live_guide_id: crypto.randomUUID() }]]) {
    const r = await gen(b, body); check(`palier gratuit : ${name} refusé (403 plan_required)`, r.s === 403, `${r.s}`);
  }
  const ok = await api(d, "/api/admin/action", { action: "reset_quota", user_id: a.id });
  check("témoin : l'administrateur peut utiliser /api/admin/action", ok.s === 200, `${ok.s}`);
  const adminPage = await web(d, "/admin"); check("témoin : l'administrateur voit /admin", adminPage.status === 200, `${adminPage.status}`);

  console.log("\n— Sans connexion —");
  for (const [m, p] of [["POST", "/api/generate"], ["POST", "/api/checkout"], ["POST", "/api/admin/action"], ["POST", "/api/account/delete"], ["GET", "/api/account/export"], ["POST", "/api/editorial/validation"]]) {
    const r = await web(null, p, { method: m, headers: J, body: m === "POST" ? "{}" : undefined }); check(`${m} ${p} sans session : 401`, r.status === 401, `${r.status}`);
  }
  { const r = await web(null, "/api/cron/reminders"); check("GET /api/cron/reminders sans secret : 401 ou 503 (jamais 200)", r.status === 401 || r.status === 503, `${r.status}`);
    const r2 = await web(null, "/api/cron/reminders", { headers: { Authorization: "Bearer mauvais-secret" } }); check("GET /api/cron/reminders avec un mauvais secret : 401 ou 503", r2.status === 401 || r2.status === 503, `${r2.status}`); }
  { const fake = "A".repeat(43);
    const page = await web(null, `/validation/${fake}`); const body = await page.text();
    check("lien de validation inconnu : page neutre (200, rien de la marque)", page.status === 200 && body.includes("n'est plus valable") && !body.includes("Bonjour"), `${page.status}`);
    check("lien de validation de forme invalide : même page neutre", (await web(null, "/validation/pas-un-jeton")).status === 200);
    const d = await web(null, "/api/validation/decide", { method: "POST", headers: J, body: JSON.stringify({ token: fake, post_id: crypto.randomUUID(), decision: "approuve" }) });
    check("décision avec un faux lien : 404", d.status === 404, `${d.status}`);
    const d2 = await web(null, "/api/validation/decide", { method: "POST", headers: J, body: JSON.stringify({ token: "court", post_id: "x", decision: "approuve" }) });
    check("décision mal formée : 400", d2.status === 400, `${d2.status}`);
    for (const p of ["/api/validation/create", "/api/validation/revoke"]) { const r = await web(null, p, { method: "POST", headers: J, body: "{}" }); check(`POST ${p} sans session : 401`, r.status === 401, `${r.status}`); } }
  for (const p of ["/dashboard", "/dashboard/account", "/dashboard/community", "/dashboard/assistant", "/dashboard/kpi", "/dashboard/personas", "/dashboard/ideas", "/dashboard/posts", "/admin", "/reset-password"]) { const r = await web(null, p); check(`${p} sans session : redirigé vers la connexion`, r.status === 307, `${r.status}`); }

  console.log("\n— Paiement : montants et notifications falsifiés —");
  const co = await api(b, "/api/checkout", { plan: "pro", amount: 1, user_id: a.id, status: "completed" });
  const pay = (await sb(`/rest/v1/payments?user_id=eq.${b.id}&select=id,amount,user_id,status,provider_token&order=created_at.desc`)).j?.[0];
  check("montant imposé par le client (amount: 1) ignoré : 12 000 attribués à B", pay?.amount === 12000 && pay.user_id === b.id && pay.status !== "completed", `${co.s} ${JSON.stringify(pay)}`);
  check("agence avec 1 siège : refusé", (await api(b, "/api/checkout", { plan: "agence", seats: 1 })).s === 400);
  await fetch(BASE + "/api/payments/webhook", { method: "POST", headers: J, body: JSON.stringify({ data: { invoice: { token: "faux-jeton" } } }) });
  if (pay?.provider_token) await fetch(BASE + "/api/payments/webhook", { method: "POST", headers: J, body: JSON.stringify({ data: { invoice: { token: pay.provider_token, status: "completed" } } }) });
  if (pay?.id) await web(null, `/payment/return?ref=${pay.id}`);
  check("notification falsifiée et retour sans paiement réel : aucun palier activé", (await sb("/rest/v1/rpc/active_plan", { method: "POST", body: { uid: b.id } })).j === "gratuit");
  const p2 = (await sb(`/rest/v1/payments?id=eq.${pay?.id}&select=status`)).j?.[0];
  check("le paiement de B reste « en attente » (rien n'est payé chez le prestataire)", p2?.status === "pending", JSON.stringify(p2));
} catch (e) { fail++; console.error("Erreur :", e.message); }
finally {
  for (const [bucket, p] of files) await sb(`/storage/v1/object/${bucket}/${p}`, { method: "DELETE" });
  for (const u of made) await sb(`/auth/v1/admin/users/${u.id}`, { method: "DELETE" });
  console.log(`\n${pass} réussis, ${fail} échoués (${made.length} comptes jetables supprimés)`);
  process.exit(fail ? 1 : 0);
}
