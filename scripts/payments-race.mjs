// Test de course de bout en bout sur le paiement, avec le simulateur. Compte jetable supprimé à la fin.
// Usage : PAYMENTS_MOCK=1 npx next dev --webpack -p 3014   puis   node --env-file=.env.local scripts/payments-race.mjs
// (le simulateur est refusé en production : ne jamais mettre PAYMENTS_MOCK dans .env.local)
const U = process.env.NEXT_PUBLIC_SUPABASE_URL, A = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, S = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BASE = process.env.BASE_URL || "http://localhost:3014";
const ref = new URL(U).hostname.split(".")[0];
const adm = (p, o = {}) => fetch(U + p, { ...o, headers: { apikey: S, Authorization: "Bearer " + S, "Content-Type": "application/json", Prefer: "return=representation", ...(o.headers || {}) } }).then(async (r) => ({ s: r.status, j: await r.json().catch(() => null) }));
let pass = 0, fail = 0;
const check = (n, ok, x = "") => { ok ? pass++ : fail++; console.log(`${ok ? "✓" : "✗"} ${n}${ok ? "" : "  " + x}`); };
const email = `race.${Date.now()}@example.com`, password = "RaceTest-12345";
let uid;
try {
  const c = await adm("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true }) });
  uid = c.j.id;
  const t = await fetch(U + "/auth/v1/token?grant_type=password", { method: "POST", headers: { apikey: A, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) }).then((r) => r.json());
  const val = "base64-" + Buffer.from(JSON.stringify(t)).toString("base64url");
  const name = `sb-${ref}-auth-token`;
  const parts = []; for (let i = 0; i < val.length; i += 3180) parts.push(val.slice(i, i + 3180));
  const cookie = parts.length === 1 ? `${name}=${val}` : parts.map((p, i) => `${name}.${i}=${p}`).join("; ");
  const checkout = async (plan = "pro") => (await fetch(BASE + "/api/checkout", { method: "POST", headers: { "Content-Type": "application/json", cookie }, body: JSON.stringify({ plan }) })).json();
  const pay = async (url) => { const tok = new URL(url).searchParams.get("token"); const r = await fetch(`${BASE}/payment/mock/pay?token=${tok}&ok=1`, { redirect: "manual", headers: { cookie } }); console.log("  mock/pay ->", r.status, r.headers.get("location")); return tok; };
  const hook = async (tok) => { const r = await hook0(tok); if (!globalThis.__d) { globalThis.__d = 1; console.log("  webhook ->", r.status, await r.clone().text()); } return r; };
  const hook0 = (tok) => fetch(BASE + "/api/payments/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: { invoice: { token: tok } } }) });
  const payments = async () => (await adm(`/rest/v1/payments?user_id=eq.${uid}&select=id,status,confirmed_at,plan&order=created_at`)).j;
  const sub = async () => (await adm(`/rest/v1/subscriptions?user_id=eq.${uid}&select=plan,status,current_period_start,current_period_end,provider_transaction_id`)).j?.[0];
  const addDays = (d, n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

  await fetch(BASE + "/api/payments/webhook", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); await fetch(BASE + "/payment/return?ref=00000000-0000-0000-0000-000000000000", { redirect: "manual" });
  // 1. Une facture, 15 confirmations simultanées (webhook + retour)
  const co = await checkout();
  check("checkout crée une facture", co.ok === true, JSON.stringify(co));
  const tok = await pay(co.url);
  const rs = await Promise.all([...Array(12)].map(() => hook(tok)));
  const p1 = await payments(); const s1 = await sub();
  check("12 webhooks simultanés : tous répondent sans erreur 5xx", rs.slice(0, 12).every((r) => r.status === 200), rs.slice(0, 12).map((r) => r.status).join(","));
  check("un seul paiement, statut completed, une seule date de confirmation", p1.length === 1 && p1[0].status === "completed" && !!p1[0].confirmed_at, JSON.stringify(p1));
  check("abonnement Pro actif, une période d'un mois", s1?.plan === "pro" && s1.status === "active" && s1.current_period_end === addDays(0, 0).replace(/^(\d+)-(\d+)-(\d+)$/, (_, y, m, d) => { const t = new Date(Date.UTC(+y, +m, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(+d, last)); return t.toISOString().slice(0, 10); }), JSON.stringify(s1));

  // 2. Même jeton rejoué : aucun effet
  await hook(tok); const s1b = await sub();
  check("rejeu du même jeton : abonnement inchangé", JSON.stringify(s1b) === JSON.stringify(s1));

  // 3. Renouvellement anticipé : il reste 3 jours, on paie un mois de plus
  await adm(`/rest/v1/subscriptions?user_id=eq.${uid}`, { method: "PATCH", body: JSON.stringify({ current_period_end: addDays(0, 3) }) });
  const co2 = await checkout(); const tok2 = await pay(co2.url); await hook(tok2);
  const s2 = await sub();
  const expectedExtended = (() => { const [y, m, d] = addDays(0, 3).split("-").map(Number); const t = new Date(Date.UTC(y, m, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(d, last)); return t.toISOString().slice(0, 10); })();
  console.log(`  (fin avant : ${addDays(0, 3)}, fin après : ${s2?.current_period_end}, attendu si les jours restants sont conservés : ${expectedExtended})`);
  check("renouvellement anticipé : les jours restants sont conservés", s2?.current_period_end === expectedExtended, `fin = ${s2?.current_period_end}`);

  // 4. Double clic sur « Choisir » : deux factures en attente
  const [c3, c4] = await Promise.all([checkout(), checkout()]);
  const pend = (await payments()).filter((p) => p.status === "pending").length;
  check("double clic : une seule facture en attente, l'autre requête est refusée proprement", pend === 1 && [c3, c4].filter((c) => c.ok).length === 1, `${pend} en attente, réponses : ${JSON.stringify([c3, c4])}`);
} catch (e) { fail++; console.error("Erreur :", e.message); }
finally {
  if (uid) await adm(`/auth/v1/admin/users/${uid}`, { method: "DELETE" });
  console.log(`\n${pass} réussis, ${fail} échoués (compte jetable supprimé)`);
}
