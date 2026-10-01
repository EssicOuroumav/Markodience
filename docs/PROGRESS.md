# Markodience — Suivi d'avancement

Ordre : suivre les 8 prompts de `markodience-8-prompts-claude-code.md`, sans pause entre eux.
Reprise après coupure : lire ce fichier, repartir de « Étape en cours ».

## Terminé
- [x] Étape 1 — Socle : Next.js 14, tokens de design, Navbar glass, clients Supabase, middleware d'auth, migration initiale (`supabase/migrations/20261001000100_init_schema.sql`), `.env.example`. Build + lint + typecheck OK.

- [x] Étape 2 — Onboarding 2 étapes + connexion + dashboard vide. Vérifié dans le navigateur (inscription → profil → dashboard) et via l'API : trigger d'abonnement gratuit, RLS (isolation entre utilisateurs, abonnement non modifiable par l'utilisateur), storage logos par dossier utilisateur.
- [x] Migrations 1 et 2 appliquées sur Supabase (vérifié). Confirm email désactivé, provider Email actif.

- [x] Étape 3 — Dashboard (sidebar 7 onglets, sélecteur de profil glass, cookie `active_brand`), route `/api/generate` (auth + RLS + zod + persistance serveur), onglets Identité / Piliers / Tonalité avec édition inline et sauvegarde auto. Vérifié dans le navigateur en mode `AI_MOCK=1` (génération, édition, persistance après rechargement) ; sans mock, l'appel réel atteint Anthropic et renvoie un message clair « crédit épuisé » (clé valide, crédit à ajouter). 8 tests Vitest, lint, build OK.

- [x] Migration 3 appliquée et vérifiée (lives, plans, bucket audits, colonnes validation).
- [x] Étape 4 — Ligne éditoriale : canaux + période (1/3 mois), génération avec rotation des piliers déterministe (`lib/editorial.ts`), statuts cliquables, édition inline, régénération d'une semaine, glisser-déposer persistant, workflow de validation via `/api/editorial/validation` (nom pris de la session). Vérifié dans le navigateur (mode mock). 15 tests Vitest.

- [x] Étape 5 — Audit : dépôt (≤5 fichiers, png/jpg/pdf, 10 Mo) vers bucket privé `audits`, analyse serveur (fichiers lus depuis le Storage, jamais en base64 côté client), rapport en composants React (0 `dangerouslySetInnerHTML`), historique. Chemins validés (dossier de l'audit uniquement). Middleware : /api/* non connecté → 401 JSON. Vérifié dans le navigateur (mock). 21 tests.

- [x] Étape 6 — KPIs & Reporting : formulaire mensuel (upsert par mois, `submitted_at` conservé à la mise à jour), échéance réglable (`kpi_deadline_day`), bannières à soumettre / en retard / envoyé, historique à temps/en retard, lecture seule des archives, export PDF jsPDF + autotable (`lib/kpiPdf.ts`, paramètre `watermark` prêt pour l'étape 9). Vérifié dans le navigateur (soumission, bannières, lecture seule, PDF téléchargé, persistance de l'échéance). 33 tests.

- [x] Étape 7 — Règles opérationnelles : accordéon 6 sections (première ouverte), textarea + aperçu mini-markdown rendu en composants React (`lib/rules.ts`, HTML saisi = texte brut), sauvegarde auto au blur (upsert), état vide explicite. Vérifié dans le navigateur. 37 tests.

- [x] Étape 8 — Guide Lives : activation par profil (`lives_enabled`), guides par objectif (5 trames distinctes), génération trame / régénération d'une étape / scripts + banque de réponses rapides (copie 1 clic, ajout manuel, pas de doublons à la régénération), réorganisation par boutons ↑↓, équipe partagée par profil (manuel). Aucune connexion aux plateformes. Vérifié dans le navigateur (mock). 40 tests.

- [~] Étape 9 — Paliers + paiement : code écrit (plans.ts, interface PaymentProvider + PayDunya + mock, /api/checkout, /api/payments/webhook, /payment/return, verrouillage UI + API, migration 4 RLS). EN ATTENTE : migration 4 à exécuter, puis tests réels.

## Étape en cours
- Étape 9 — vérification (migration 4 appliquée ? test mock du parcours paiement, test RLS palier gratuit), puis étape 10 : audit sécurité global, tests e2e, déploiement Vercel.

## En attente côté utilisateur
- GitHub : dépôt EssicOuroumav/Markodience passé en PRIVÉ ; le `git push` a été bloqué par le garde-fou de la session (6+ commits locaux non poussés). À pousser quand l'utilisateur l'autorise explicitement.
- SUPABASE_SERVICE_ROLE_KEY : OK (service_role vérifiée). Nettoyage des comptes de test (t1/t2/ui.test…@example.com) à faire avec cette clé.
- ANTHROPIC_API_KEY : clé présente et valide, crédit à ajouter (5 $ prévus le 2026-10-02). Pour tester sans crédit : ajouter `AI_MOCK=1` dans .env.local (JAMAIS en production).
- CinetPay : identifiants sandbox.

## Décisions
- Anthropic : modèle `claude-sonnet-5-5` (le prompt dit `claude-sonnet-5`).
- Table `audits` ajoutée au schéma initial (absente du prompt 1).
- Paiement derrière une interface `PaymentProvider` (CinetPay en V1).
- Next 14.2.35 : `npm audit` signale des vulnérabilités corrigées seulement en Next 15+ — à traiter lors de l'audit final.

- Fournisseur de paiement : PayDunya (pas CinetPay). Variables PAYDUNYA_* à remplir (clés sandbox).
