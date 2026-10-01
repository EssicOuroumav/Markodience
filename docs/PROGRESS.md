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

- [x] Étape 9 — Paliers + paiement : `lib/plans.ts` (source unique), PaymentProvider (PayDunya + mock dev), /api/checkout (montant recalculé serveur), webhook sans confiance au corps (vérification serveur-à-serveur + atomique + idempotent), retour /payment/return, cadenas + upsell, gating API + RLS restrictives (migration 4 appliquée et vérifiée : 18 cas), limite de profils, filigrane PDF selon plan. Vérifié dans le navigateur avec le mock (gratuit → paiement → Pro débloqué, annulation, faux webhooks rejetés). 47 tests. NON VÉRIFIÉ : échange réel avec PayDunya (clés sandbox manquantes).

- [~] Étape 10 — audit : en-têtes de sécurité (CSP, HSTS, X-Frame-Options…) vérifiés en build production sans violation ; `npm run test:security` (23 contrôles RLS/paliers, comptes jetables auto-supprimés) ; aucun secret dans le bundle client ni dans Git. Next 14.2.35 (vulnérable) remplacé par Next 16.3.8 + React 19 (`npm audit` : 0 vulnérabilité) ; middleware → proxy.ts, cookies/params asynchrones, ESLint 9 flat config. Déploiement Vercel → confirmation utilisateur.

- [x] Quota IA quotidien (gratuit 10 / pro 60 / agence 200 par jour, 00:00 UTC) : migration 5 appliquée ; remboursement si la génération échoue et refus 429 à la limite vérifiés sur la vraie route ; `npm run test:security` : 29 contrôles OK.
- [x] Paiement PayDunya RÉEL (sandbox) vérifié de bout en bout : facture créée par l'app, paiement avec compte fictif, retour /payment/return → vérification serveur-à-serveur (statut + montant + ref) → abonnement Agence 2 sièges activé. /payment/return rendu public (vérifie côté serveur). Reste à valider : webhook IPN (nécessite une URL publique).

- [x] DÉPLOYÉ sur Vercel : https://markodience.vercel.app (production, paiements en SANDBOX). Vérifié : pages publiques 200, routes protégées → /login, API 401, webhook forgé rejeté, mock inaccessible, en-têtes de sécurité, 0 secret dans le JS client. Variables Vercel : 7 (Supabase x3, Anthropic, PayDunya x3) ; framework Next.js réglé par CLI. Comptes de test supprimés.
- [~] /auth/callback (retour du lien de confirmation email) + emailRedirectTo : code prêt, à pousser (git push par l'utilisateur) → redéploiement auto Vercel.

- [x] Accès propriétaire : script `scripts/make-owner.mjs <email>` (rôle `admin` dans app_metadata + abonnement Agence permanent) appliqué au compte du propriétaire ; le propriétaire n'est soumis à aucun quota IA ; espace /admin (vue d'ensemble, utilisateurs avec gestion du palier / quota / suspension, paiements), 404 pour tout non-admin (pages et API), vérifié ; rôle non auto-attribuable (test de sécurité).
- [x] Adaptation des logos (carré, rond, large, vertical) : `components/BrandLogo.tsx` (détection côté client, sans migration), pastille d'initiales sans logo.
- [x] Refonte du design : jetons (canaux RGB → les teintes /10 fonctionnent enfin), cartes blanches sur fond canvas, icônes lucide, illustrations SVG maison (`components/illustrations.tsx`), accueil complet (hero + maquette, fonctionnalités, méthode, bandeau sombre, tarifs, FAQ, appel final), pages de connexion en écran partagé, sidebar (marque, palier, déconnexion), en-têtes de page, états vides illustrés, mobile vérifié. Aucune photo : uniquement des illustrations vectorielles (en attente des photos du propriétaire si souhaité).
- [~] À pousser : tout ce lot (git push par l'utilisateur) → redéploiement auto Vercel.

- [x] Correctif logo : le logo ramène à /dashboard (ou /admin) quand connecté ; l'accueil détecte la session (« Mon espace »).
- [x] Passe « premium » des onglets : page Vue d'ensemble (progression de la stratégie, indicateurs, prochaine étape), questionnaire d'identité en 4 étapes + chargement soigné + barre fixe, anneaux de score, piliers numérotés, tonalité teintée avec icônes, liseré de statut éditorial, onglets en pilules, accordéon des règles à icônes, frise chronologique des lives, formulaire KPI en carte, zone de dépôt d'audit.
- [x] DÉCISION (utilisateur) : profils inclus sans frais supplémentaires ; limites Gratuit 1 / Pro 3 / Agence 10 ; propriétaire illimité. Code + migration 6 (`20261001000600_profile_limits.sql`) prêts. EN ATTENTE : migration 6 à exécuter dans le SQL Editor + git push.

## Étape en cours
- Reste : Supabase Site URL = https://markodience.vercel.app + Redirect URL https://markodience.vercel.app/** ; push de /auth/callback ; test d'inscription réelle ; crédit Anthropic (2026-10-02) puis test génération réelle ; webhook IPN PayDunya (test réel sur le site en ligne) ; plus tard : clés PayDunya production, SMTP personnalisé.

## En attente côté utilisateur
- GitHub : dépôt EssicOuroumav/Markodience passé en PRIVÉ ; le `git push` a été bloqué par le garde-fou de la session (6+ commits locaux non poussés). À pousser quand l'utilisateur l'autorise explicitement.
- SUPABASE_SERVICE_ROLE_KEY : OK (service_role vérifiée). Nettoyage des comptes de test (t1/t2/ui.test…@example.com) à faire avec cette clé.
- ANTHROPIC_API_KEY : clé présente et valide, crédit à ajouter (5 $ prévus le 2026-10-02). Pour tester sans crédit : ajouter `AI_MOCK=1` dans .env.local (JAMAIS en production).
- CinetPay : identifiants sandbox.

## Décisions
- Anthropic : modèle `claude-sonnet-5-5` (le prompt dit `claude-sonnet-5`).
- Table `audits` ajoutée au schéma initial (absente du prompt 1).
- Paiement derrière une interface `PaymentProvider` (CinetPay en V1).
- Stack : Next 16.3.8 (migré depuis 14 pour les correctifs de sécurité, décision utilisateur).

- Fournisseur de paiement : PayDunya (pas CinetPay). Variables PAYDUNYA_* à remplir (clés sandbox).
