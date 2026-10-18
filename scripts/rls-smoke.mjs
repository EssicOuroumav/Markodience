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
  // Comptes jetables créés avec la clé service (« Confirm email » peut rester activé), puis connexion par mot de passe.
  const email = `smoke.${tag}.${stamp}@example.com`, password = "SmokeTest-12345";
  const c = await call("/auth/v1/admin/users", { method: "POST", key: S, body: { email, password, email_confirm: true } });
  if (!c.json?.id) throw new Error("création du compte jetable impossible : " + c.status);
  const t = await call("/auth/v1/token?grant_type=password", { method: "POST", body: { email, password } });
  if (!t.json?.access_token) throw new Error("connexion du compte jetable impossible");
  const u = { id: c.json.id, token: t.json.access_token }; users.push(u); return u;
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
  // Publications : isolation et verrouillage du palier gratuit
  const postRow = await admin("/rest/v1/posts", { method: "POST", body: { brand_profile_id: aProfile, caption: "test" } });
  check("publications : création par le service", postRow.status === 201, postRow.status);
  check("publications : B ne voit pas celles de A", (await rest(b, `posts?brand_profile_id=eq.${aProfile}`)).json?.length === 0);
  check("publications : A (gratuit) les lit", (await rest(a, `posts?brand_profile_id=eq.${aProfile}`)).json?.length === 1);
  check("gratuit : écriture posts refusée", (await rest(a, "posts", { method: "POST", body: { brand_profile_id: aProfile, caption: "x" } })).status === 403);
  check("publications : B ne peut pas écrire chez A", (await rest(b, "posts", { method: "POST", body: { brand_profile_id: aProfile, caption: "x" } })).status === 403);
  // Cibles et banque d'idées : ouvertes à tous les paliers, isolées par marque
  const per = await rest(a, "personas", { method: "POST", body: { brand_profile_id: aProfile, name: "Cible A" } });
  check("personas : A crée une cible (palier gratuit)", per.status === 201, per.status);
  check("personas : B ne voit pas celles de A", (await rest(b, `personas?brand_profile_id=eq.${aProfile}`)).json?.length === 0);
  check("personas : B ne peut pas écrire chez A", (await rest(b, "personas", { method: "POST", body: { brand_profile_id: aProfile, name: "X" } })).status === 403);
  const idea = await rest(a, "content_ideas", { method: "POST", body: { brand_profile_id: aProfile, title: "Idée A" } });
  check("idées : A crée une idée (palier gratuit)", idea.status === 201, idea.status);
  check("idées : B ne voit pas celles de A", (await rest(b, `content_ideas?brand_profile_id=eq.${aProfile}`)).json?.length === 0);
  check("idées : B ne peut pas écrire chez A", (await rest(b, "content_ideas", { method: "POST", body: { brand_profile_id: aProfile, title: "X" } })).status === 403);
  check("idées : lien non web refusé par la base", (await rest(a, "content_ideas", { method: "POST", body: { brand_profile_id: aProfile, title: "X", url: "javascript:alert(1)" } })).status >= 400);
  check("idées : statut inconnu refusé", (await rest(a, "content_ideas", { method: "POST", body: { brand_profile_id: aProfile, title: "X", status: "autre" } })).status >= 400);

  // Calendrier : nouveaux statuts, validation par lien, liens de la médiathèque
  const okPost = await admin("/rest/v1/posts", { method: "POST", body: { brand_profile_id: aProfile, caption: "x", status: "a_valider" } });
  check("publications : statut « À valider » accepté", okPost.status === 201, okPost.status);
  check("publications : l'ancien statut « pret » est refusé", (await admin("/rest/v1/posts", { method: "POST", body: { brand_profile_id: aProfile, caption: "x", status: "pret" } })).status >= 400);
  check("publications : lien de visuel non web refusé", (await admin("/rest/v1/posts", { method: "POST", body: { brand_profile_id: aProfile, caption: "x", design_link: "javascript:alert(1)" } })).status >= 400);
  const postId = (await admin(`/rest/v1/posts?brand_profile_id=eq.${aProfile}&status=eq.a_valider&select=id`)).json?.[0]?.id;
  check("validation : A (gratuit) ne peut pas créer de lien", (await rest(a, "validation_requests", { method: "POST", body: { brand_profile_id: aProfile, token_hash: "h".repeat(64), reviewer: "X", post_ids: [postId], expires_at: "2099-01-01" } })).status === 403);
  const vr = await admin("/rest/v1/validation_requests", { method: "POST", body: { brand_profile_id: aProfile, token_hash: "a".repeat(64), reviewer: "Direction", post_ids: [postId], expires_at: "2099-01-01" } });
  check("validation : création par le service", vr.status === 201, vr.status);
  check("validation : B ne voit pas les liens de A", (await rest(b, `validation_requests?brand_profile_id=eq.${aProfile}`)).json?.length === 0);
  check("validation : un jeton identique est refusé (empreinte unique)", (await admin("/rest/v1/validation_requests", { method: "POST", body: { brand_profile_id: aProfile, token_hash: "a".repeat(64), reviewer: "Y", post_ids: [postId], expires_at: "2099-01-01" } })).status === 409);
  await admin("/rest/v1/post_reviews", { method: "POST", body: { post_id: postId, reviewer: "Direction", decision: "modifs", comment: "Changer la photo" } });
  check("validation : A lit les retours de ses publications", (await rest(a, `post_reviews?post_id=eq.${postId}`)).json?.length === 1);
  check("validation : B ne lit pas les retours de A", (await rest(b, `post_reviews?post_id=eq.${postId}`)).json?.length === 0);
  check("validation : personne ne peut écrire un retour depuis son compte", (await rest(a, "post_reviews", { method: "POST", body: { post_id: postId, reviewer: "Moi", decision: "approuve" } })).status === 403);
  check("médiathèque : liens réservés aux paliers payants", (await rest(a, "media_links", { method: "POST", body: { brand_profile_id: aProfile, label: "Canva", url: "https://canva.com/x", kind: "canva" } })).status === 403);
  const ml = await admin("/rest/v1/media_links", { method: "POST", body: { brand_profile_id: aProfile, label: "Canva", url: "https://canva.com/x", kind: "canva" } });
  check("médiathèque : création par le service", ml.status === 201, ml.status);
  check("médiathèque : lien non web refusé", (await admin("/rest/v1/media_links", { method: "POST", body: { brand_profile_id: aProfile, label: "X", url: "javascript:alert(1)" } })).status >= 400);
  check("médiathèque : B ne voit pas les liens de A", (await rest(b, `media_links?brand_profile_id=eq.${aProfile}`)).json?.length === 0);

  // Lot D : communauté, interactions, indicateurs
  await admin("/rest/v1/brand_profiles", { method: "POST", body: { user_id: b.id, name: "B1" } });
  const bProfile = (await admin(`/rest/v1/brand_profiles?user_id=eq.${b.id}&select=id`)).json?.[0]?.id;
  check("communauté : écriture réservée aux paliers payants", (await rest(a, "community_items", { method: "POST", body: { brand_profile_id: aProfile, kind: "faq", title: "Q", body: "R" } })).status === 403);
  check("interactions : écriture réservée aux paliers payants", (await rest(a, "interactions", { method: "POST", body: { brand_profile_id: aProfile, person: "X" } })).status === 403);
  check("indicateurs : écriture réservée aux paliers payants", (await rest(a, "kpi_definitions", { method: "POST", body: { brand_profile_id: aProfile, name: "K" } })).status === 403);
  const ci = await admin("/rest/v1/community_items", { method: "POST", body: { brand_profile_id: aProfile, kind: "crise", title: "Q", body: "R", level: "grave" } });
  check("communauté : création par le service", ci.status === 201, ci.status);
  check("communauté : type inconnu refusé", (await admin("/rest/v1/community_items", { method: "POST", body: { brand_profile_id: aProfile, kind: "autre", title: "Q", body: "R" } })).status >= 400);
  check("communauté : B ne voit pas les éléments de A", (await rest(b, `community_items?brand_profile_id=eq.${aProfile}`)).json?.length === 0);
  const kd = await admin("/rest/v1/kpi_definitions", { method: "POST", body: { brand_profile_id: aProfile, name: "Messages", target: 100, direction: "hausse" } });
  check("indicateurs : création par le service", kd.status === 201, kd.status);
  const kdId = (await admin(`/rest/v1/kpi_definitions?brand_profile_id=eq.${aProfile}&name=eq.Messages&select=id`)).json?.[0]?.id;
  check("indicateurs : identifiants lus", !!kdId && !!bProfile);
  check("indicateurs : sens inconnu refusé", (await admin("/rest/v1/kpi_definitions", { method: "POST", body: { brand_profile_id: aProfile, name: "X", direction: "diagonale" } })).status >= 400);
  check("indicateurs : B ne voit pas ceux de A", (await rest(b, `kpi_definitions?brand_profile_id=eq.${aProfile}`)).json?.length === 0);
  check("valeurs : une valeur ne peut pas viser l'indicateur d'une autre marque", (await admin("/rest/v1/kpi_values", { method: "POST", body: { definition_id: kdId, brand_profile_id: bProfile, month: "2026-10-01", value: 5 } })).status >= 400);
  check("valeurs : valeur valide acceptée", (await admin("/rest/v1/kpi_values", { method: "POST", body: { definition_id: kdId, brand_profile_id: aProfile, month: "2026-10-01", value: 5 } })).status === 201);
  check("valeurs : un mois ne peut être saisi qu'une fois", (await admin("/rest/v1/kpi_values", { method: "POST", body: { definition_id: kdId, brand_profile_id: aProfile, month: "2026-10-01", value: 6 } })).status === 409);
  check("actions : une action ne peut pas viser l'indicateur d'une autre marque", (await admin("/rest/v1/kpi_actions", { method: "POST", body: { brand_profile_id: bProfile, definition_id: kdId, title: "x" } })).status >= 400);

  // Limitation de débit : table et fonctions réservées au backend
  check("limiteur : un utilisateur connecté ne peut pas lire la table", (await rest(a, "rate_limits?select=key")).status >= 400 || (await rest(a, "rate_limits?select=key")).json?.length === 0);
  check("limiteur : un utilisateur connecté ne peut pas écrire dans la table", (await rest(a, "rate_limits", { method: "POST", body: { key: "x", count: 1, reset_at: "2099-01-01" } })).status >= 400);
  check("limiteur : un utilisateur connecté ne peut pas appeler la fonction", (await rest(a, "rpc/consume_rate_limit", { method: "POST", body: { p_key: "x", p_max: 1, p_window_seconds: 60 } })).status >= 400);
  check("limiteur : un utilisateur connecté ne peut pas purger", (await rest(a, "rpc/purge_rate_limits", { method: "POST", body: {} })).status >= 400);
  { const k = "smoke-" + stamp; const call1 = () => admin("/rest/v1/rpc/consume_rate_limit", { method: "POST", body: { p_key: k, p_max: 2, p_window_seconds: 60 } });
    const r = [(await call1()).json, (await call1()).json, (await call1()).json];
    check("limiteur : autorise 2 appels puis refuse le 3e (fonction atomique)", r[0] === true && r[1] === true && r[2] === false, JSON.stringify(r)); }
  check("limiteur : paramètres invalides refusés", (await admin("/rest/v1/rpc/consume_rate_limit", { method: "POST", body: { p_key: "x", p_max: 0, p_window_seconds: 60 } })).status >= 400);

  // Plan stratégique : réservé aux paliers payants, isolé par marque
  check("gratuit : écriture brand_strategy refusée", (await rest(a, "brand_strategy", { method: "POST", body: { brand_profile_id: aProfile, brief: {} } })).status === 403);
  const stratRow = await admin("/rest/v1/brand_strategy", { method: "POST", body: { brand_profile_id: aProfile, brief: { x: 1 } } });
  check("brand_strategy : création par le service", stratRow.status === 201, stratRow.status);
  check("brand_strategy : B ne la voit pas", (await rest(b, `brand_strategy?brand_profile_id=eq.${aProfile}`)).json?.length === 0);
  check("brand_strategy : B ne peut pas écrire chez A", (await rest(b, "brand_strategy", { method: "POST", body: { brand_profile_id: aProfile, brief: {} } })).status === 403);
  check("gratuit : piliers autorisés", (await rest(a, "content_pillars", { method: "POST", body: { brand_profile_id: aProfile, name: "p" } })).status === 201);
  const up = await call(`/storage/v1/object/audits/${aProfile}/x/1.png`, { method: "POST", token: a.token, raw: { type: "image/png", data: Buffer.from("x") } });
  check("gratuit : dépôt dans le bucket audits refusé", up.status >= 400);
  const upLib = await call(`/storage/v1/object/library/${aProfile}/x.png`, { method: "POST", token: a.token, raw: { type: "image/png", data: Buffer.from("x") } });
  check("gratuit : dépôt dans la bibliothèque refusé", upLib.status >= 400, upLib.status);
  check("gratuit : écriture assets refusée", (await rest(a, "assets", { method: "POST", body: { brand_profile_id: aProfile, name: "x", path: `${aProfile}/x.png`, mime: "image/png", size_bytes: 1 } })).status === 403);
  check("B ne peut pas lire les fichiers de A", (await rest(b, `assets?brand_profile_id=eq.${aProfile}`)).json?.length === 0);

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

  // Rôle administrateur : modifiable uniquement avec la clé service
  await call("/auth/v1/user", { method: "PUT", token: a.token, body: { app_metadata: { role: "admin" }, data: { role: "admin" } } });
  const me = await call("/auth/v1/user", { token: a.token });
  check("l'utilisateur ne peut pas s'attribuer le rôle admin", me.json?.app_metadata?.role !== "admin", JSON.stringify(me.json?.app_metadata));

  // Quota IA
  check("l'utilisateur ne peut pas écrire son quota", (await rest(a, "ai_usage", { method: "POST", body: { user_id: a.id, count: 0 } })).status === 403);
  check("l'utilisateur ne peut pas appeler consume_ai_quota", (await call("/rest/v1/rpc/consume_ai_quota", { method: "POST", token: a.token, body: { p_user: a.id, p_limit: 999 } })).status === 403);
  const q = [];
  for (let i = 0; i < 3; i++) q.push((await admin("/rest/v1/rpc/consume_ai_quota", { method: "POST", body: { p_user: b.id, p_limit: 2 } })).json);
  check("quota : 1, 2 puis refus (-1) à la limite", JSON.stringify(q) === "[1,2,-1]", JSON.stringify(q));
  await admin("/rest/v1/rpc/refund_ai_quota", { method: "POST", body: { p_user: b.id } });
  check("quota : remboursement puis nouvelle consommation autorisée", (await admin("/rest/v1/rpc/consume_ai_quota", { method: "POST", body: { p_user: b.id, p_limit: 2 } })).json === 2);
  check("quota : lecture de son propre compteur", (await rest(b, "ai_usage?select=count")).json?.[0]?.count === 2);
  check("quota : isolation des compteurs", (await rest(a, "ai_usage?select=count")).json?.length === 0);

  // Paiements : activation atomique (migration 20261001000700)
  const addM = (iso, n) => { const [y, m, d] = iso.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1 + n, 1)); const last = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 0)).getUTCDate(); t.setUTCDate(Math.min(d, last)); return t.toISOString().slice(0, 10); };
  const day = (n = 0) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const subOf = async (u) => (await admin(`/rest/v1/subscriptions?user_id=eq.${u.id}&select=plan,status,seats,current_period_start,current_period_end`)).json?.[0];
  const newPay = async (u, plan = "pro", seats = 1) => {
    const id = crypto.randomUUID();
    const r = await admin("/rest/v1/payments", { method: "POST", body: { id, user_id: u.id, plan, seats, amount: 12000, provider: "test", provider_token: `smoke_${id}` } });
    return r.status === 201 ? id : null;
  };
  const activate = (id) => admin("/rest/v1/rpc/activate_payment", { method: "POST", body: { p_payment: id } });
  check("l'utilisateur ne peut pas appeler activate_payment", (await call("/rest/v1/rpc/activate_payment", { method: "POST", token: b.token, body: { p_payment: "00000000-0000-0000-0000-000000000000" } })).status === 403);
  const unknown = await activate("00000000-0000-0000-0000-000000000000");
  check("activate_payment (migration appliquée) : paiement inconnu = claimed false", unknown.json?.claimed === false, `${unknown.status} ${JSON.stringify(unknown.json)}`);
  if (unknown.json?.claimed === false) {
    const id1 = await newPay(b);
    const races = await Promise.all([...Array(10)].map(() => activate(id1)));
    const claimed = races.filter((r) => r.json?.claimed === true).length;
    const sb1 = await subOf(b);
    check("10 activations simultanées : une seule réussit", claimed === 1, `${claimed} réussies`);
    check("abonnement Pro actif pour un mois à partir d'aujourd'hui", sb1?.plan === "pro" && sb1.status === "active" && sb1.current_period_end === addM(day(), 1), JSON.stringify(sb1));
    const st1 = (await admin(`/rest/v1/payments?id=eq.${id1}&select=status,confirmed_at`)).json?.[0];
    check("paiement terminé avec sa date de confirmation", st1?.status === "completed" && !!st1.confirmed_at, JSON.stringify(st1));
    // renouvellement anticipé du même palier : les jours restants sont conservés
    await admin(`/rest/v1/subscriptions?user_id=eq.${b.id}`, { method: "PATCH", body: { current_period_end: day(3) } });
    await activate(await newPay(b));
    check("renouvellement anticipé : le mois s'ajoute à l'échéance en cours", (await subOf(b))?.current_period_end === addM(day(3), 1), JSON.stringify(await subOf(b)));
    // changement de palier : le mois démarre aujourd'hui
    await activate(await newPay(b, "agence", 2));
    const sb3 = await subOf(b);
    check("changement de palier : agence, 2 sièges, un mois à partir d'aujourd'hui", sb3?.plan === "agence" && sb3.seats === 2 && sb3.current_period_end === addM(day(), 1), JSON.stringify(sb3));
    // abonnement échu : le mois démarre aujourd'hui
    await admin(`/rest/v1/subscriptions?user_id=eq.${b.id}`, { method: "PATCH", body: { current_period_end: "2020-01-01" } });
    await activate(await newPay(b, "agence", 2));
    check("abonnement échu : nouveau mois à partir d'aujourd'hui", (await subOf(b))?.current_period_end === addM(day(), 1), JSON.stringify(await subOf(b)));
    // une seule facture en attente par utilisateur
    const first = await admin("/rest/v1/payments", { method: "POST", body: { user_id: b.id, plan: "pro", amount: 12000, provider: "test", provider_token: `smoke_${Math.random()}` } });
    const second = await admin("/rest/v1/payments", { method: "POST", body: { user_id: b.id, plan: "pro", amount: 12000, provider: "test", provider_token: `smoke_${Math.random()}` } });
    check("une seule facture en attente par utilisateur", first.status === 201 && second.status === 409, `${first.status} / ${second.status}`);
  }

  // Demandes de génération (ai_jobs, migration 20261001000800) : lecture de ses propres demandes seulement, aucune écriture utilisateur
  const jobId = crypto.randomUUID();
  const ins = await admin("/rest/v1/ai_jobs", { method: "POST", body: { id: jobId, user_id: a.id, type: "tone" } });
  check("ai_jobs (migration appliquée) : le serveur peut créer une demande", ins.status === 201, `${ins.status} ${JSON.stringify(ins.json)}`);
  if (ins.status === 201) {
    check("l'utilisateur lit sa propre demande", (await rest(a, `ai_jobs?id=eq.${jobId}&select=status`)).json?.[0]?.status === "running");
    check("un autre utilisateur ne voit pas la demande", (await rest(b, `ai_jobs?id=eq.${jobId}&select=id`)).json?.length === 0);
    check("l'utilisateur ne peut pas créer de demande", (await rest(a, "ai_jobs", { method: "POST", body: { id: crypto.randomUUID(), user_id: a.id, type: "tone" } })).status === 403);
    await rest(a, `ai_jobs?id=eq.${jobId}`, { method: "PATCH", body: { status: "done", result: { ok: true } } });
    check("l'utilisateur ne peut pas modifier une demande", (await admin(`/rest/v1/ai_jobs?id=eq.${jobId}&select=status`)).json?.[0]?.status === "running");
    check("l'utilisateur ne peut pas supprimer une demande", (await (async () => { await rest(a, `ai_jobs?id=eq.${jobId}`, { method: "DELETE" }); return admin(`/rest/v1/ai_jobs?id=eq.${jobId}&select=id`); })()).json?.length === 1);
    check("la même demande rejouée ne se crée pas deux fois (clé unique)", (await admin("/rest/v1/ai_jobs", { method: "POST", body: { id: jobId, user_id: a.id, type: "tone" } })).status === 409);
  }

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
