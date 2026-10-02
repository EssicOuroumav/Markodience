#!/usr/bin/env node
// Liste de contrôle avant ouverture publique. Usage : npm run check:launch
// Lit .env.local (réglages locaux) et lib/legal.ts ; teste aussi le site en ligne (SITE_URL, par défaut markodience.vercel.app).
import { readFileSync, existsSync } from "node:fs";

const env = Object.fromEntries(
  (existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "").split("\n").filter((l) => /^[A-Z_]+=/.test(l)).map((l) => [l.split("=")[0], l.slice(l.indexOf("=") + 1).trim()]),
);
const site = (env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_APP_URL.includes("localhost") ? env.NEXT_PUBLIC_APP_URL : process.env.SITE_URL || "https://markodience.vercel.app").replace(/\/$/, "");
let todo = 0;
const ok = (m) => console.log(`  ✓ ${m}`);
const ko = (m, how) => { todo++; console.log(`  ✗ ${m}${how ? `\n      → ${how}` : ""}`); };

console.log("\nInformations légales (lib/legal.ts)");
const legal = readFileSync("lib/legal.ts", "utf8");
for (const [key, label] of [["editorName", "Nom ou raison sociale"], ["editorStatus", "Statut de l'éditeur"], ["address", "Adresse"], ["publicationDirector", "Directeur de la publication"], ["contactEmail", "E-mail de contact"], ["contactPhone", "Téléphone de contact"]]) {
  new RegExp(`${key}: null`).test(legal) ? ko(`${label} non renseigné`, "à compléter dans lib/legal.ts") : ok(label);
}

console.log("\nConfiguration locale (.env.local)");
for (const k of ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY", "PAYDUNYA_MASTER_KEY", "PAYDUNYA_PRIVATE_KEY", "PAYDUNYA_TOKEN"]) env[k] ? ok(k) : ko(`${k} vide`);
for (const k of ["AI_MOCK", "PAYMENTS_MOCK"]) env[k] ? ko(`${k} est actif`, "à retirer (développement uniquement)") : ok(`${k} absent`);
env.PAYDUNYA_MODE === "live" ? ok("PayDunya en mode production") : ko("PayDunya encore en mode test (sandbox)", "passer PAYDUNYA_MODE=live avec les clés de production, après validation du compte marchand");
env.NEXT_PUBLIC_APP_URL && !env.NEXT_PUBLIC_APP_URL.includes("localhost") ? ok("NEXT_PUBLIC_APP_URL défini") : ko("NEXT_PUBLIC_APP_URL pointe encore sur localhost", "mettre l'adresse publique (ex. https://markodience.com) ici et dans Vercel");

console.log(`\nSite en ligne (${site})`);
const get = async (p, init) => { try { return await fetch(site + p, { redirect: "manual", ...init }); } catch { return null; } };
for (const p of ["/", "/cgu", "/confidentialite", "/mentions-legales", "/forgot-password", "/robots.txt", "/sitemap.xml", "/icon.png", "/opengraph-image"]) {
  const r = await get(p); r && r.status === 200 ? ok(`${p} répond`) : ko(`${p} ne répond pas (${r ? r.status : "erreur réseau"})`);
}
const home = await get("/");
const csp = home?.headers.get("content-security-policy");
csp ? ok("En-têtes de sécurité présents") : ko("En-têtes de sécurité absents");
(await get("/dashboard"))?.status === 307 ? ok("Tableau de bord protégé (redirige vers la connexion)") : ko("Tableau de bord non protégé");
(await get("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }))?.status === 401 ? ok("API protégée (401 sans session)") : ko("API non protégée");

console.log(todo ? `\n${todo} point(s) à régler avant l'ouverture.\n` : "\nTout est prêt pour l'ouverture.\n");
process.exit(todo ? 1 : 0);
