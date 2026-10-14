#!/usr/bin/env node
// Sauvegarde des données de Markodience (toutes les tables, au format JSON) + liste des comptes.
// Usage : npm run db:backup            → écrit dans ~/Sauvegardes-Markodience/AAAA-MM-JJ-HHMM
//         npm run db:backup -- --check <dossier>   → relit une sauvegarde et vérifie son intégrité (empreintes et totaux)
// Les fichiers déposés (logos, médiathèque, audits) ne sont PAS inclus : ils vivent dans le stockage Supabase.
// Les sauvegardes contiennent des données personnelles : garde-les hors du dépôt et hors des dossiers partagés.
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const TABLES = [
  "brand_profiles", "brand_identity", "brand_strategy", "content_pillars", "personas", "content_ideas", "tone_voice",
  "editorial_lines", "editorial_entries", "posts", "validation_requests", "post_reviews", "media_links", "assets",
  "audits", "kpi_reports", "kpi_definitions", "kpi_values", "kpi_actions", "operational_rules", "live_guides", "live_team_members",
  "live_scripts", "community_items", "interactions", "subscriptions", "payments", "ai_usage", "ai_jobs", "reminder_prefs", "reminder_log",
];
const sha = (s) => createHash("sha256").update(s).digest("hex");

const args = process.argv.slice(2);
if (args[0] === "--check") {
  const dir = args[1];
  if (!dir || !existsSync(join(dir, "manifest.json"))) { console.error("Usage : npm run db:backup -- --check <dossier de sauvegarde>"); process.exit(2); }
  const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8"));
  let bad = 0;
  for (const [file, meta] of Object.entries(manifest.files)) {
    const path = join(dir, file);
    if (!existsSync(path)) { bad++; console.log(`✗ ${file} : fichier absent`); continue; }
    const text = readFileSync(path, "utf8");
    let rows = -1;
    try { rows = JSON.parse(text).length; } catch { /* illisible */ }
    const ok = sha(text) === meta.sha256 && rows === meta.rows;
    if (!ok) bad++;
    console.log(`${ok ? "✓" : "✗"} ${file} : ${rows} ligne(s)${ok ? "" : " (empreinte ou total différent)"}`);
  }
  console.log(bad ? `\n${bad} fichier(s) en défaut : cette sauvegarde n'est pas fiable.` : `\nSauvegarde intacte (${Object.keys(manifest.files).length} fichiers, faite le ${manifest.created_at}).`);
  process.exit(bad ? 1 : 0);
}

const U = process.env.NEXT_PUBLIC_SUPABASE_URL, S = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!U || !S) { console.error("Il manque NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY (lancer avec : npm run db:backup)."); process.exit(2); }
const H = { apikey: S, Authorization: `Bearer ${S}` };

async function dumpTable(name) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const r = await fetch(`${U}/rest/v1/${name}?select=*`, { headers: { ...H, Range: `${from}-${from + 999}`, "Range-Unit": "items" } });
    if (r.status === 404 || r.status === 400) return null; // table absente sur ce projet
    if (!r.ok) throw new Error(`${name} : erreur ${r.status}`);
    const page = await r.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const stamp = new Date().toISOString().slice(0, 16).replace("T", "-").replace(":", "");
const dir = join(process.env.BACKUP_DIR || join(homedir(), "Sauvegardes-Markodience"), stamp);
mkdirSync(dir, { recursive: true, mode: 0o700 });
const files = {};
const write = (file, rows) => {
  const text = JSON.stringify(rows);
  writeFileSync(join(dir, file), text, { mode: 0o600 });
  files[file] = { rows: rows.length, sha256: sha(text) };
};

let failed = 0;
for (const t of TABLES) {
  try {
    const rows = await dumpTable(t);
    if (rows === null) { console.log(`– ${t} : absente (ignorée)`); continue; }
    write(`${t}.json`, rows);
    console.log(`✓ ${t} : ${rows.length}`);
  } catch (e) { failed++; console.log(`✗ ${e.message}`); }
}
try {
  const r = await fetch(`${U}/auth/v1/admin/users?per_page=1000`, { headers: H });
  const { users } = await r.json();
  write("auth-users.json", users.map((u) => ({ id: u.id, email: u.email, created_at: u.created_at, app_metadata: u.app_metadata, user_metadata: u.user_metadata })));
  console.log(`✓ comptes : ${users.length}`);
} catch { failed++; console.log("✗ comptes : lecture impossible"); }

writeFileSync(join(dir, "manifest.json"), JSON.stringify({ created_at: new Date().toISOString(), files }, null, 1), { mode: 0o600 });
console.log(failed ? `\n${failed} élément(s) en échec : sauvegarde INCOMPLÈTE (${dir}).` : `\nSauvegarde terminée : ${dir}\nVérifier : npm run db:backup -- --check "${dir}"`);
process.exit(failed ? 1 : 0);
