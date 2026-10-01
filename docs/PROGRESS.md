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

## Étape en cours
- Étape 5 — Audit (prompt 4).

## En attente côté utilisateur
- GitHub : dépôt EssicOuroumav/Markodience passé en PRIVÉ ; le `git push` a été bloqué par le garde-fou de la session (6+ commits locaux non poussés). À pousser quand l'utilisateur l'autorise explicitement.
- SUPABASE_SERVICE_ROLE_KEY dans .env.local contient actuellement la clé anon (identique). À remplacer par la vraie clé service_role (nécessaire dès l'étape 9, webhook). Nettoyage des comptes de test (t1/t2/ui.test…@example.com) à faire avec cette clé.
- ANTHROPIC_API_KEY : clé présente et valide, crédit à ajouter (5 $ prévus le 2026-10-02). Pour tester sans crédit : ajouter `AI_MOCK=1` dans .env.local (JAMAIS en production).
- CinetPay : identifiants sandbox.

## Décisions
- Anthropic : modèle `claude-sonnet-5-5` (le prompt dit `claude-sonnet-5`).
- Table `audits` ajoutée au schéma initial (absente du prompt 1).
- Paiement derrière une interface `PaymentProvider` (CinetPay en V1).
- Next 14.2.35 : `npm audit` signale des vulnérabilités corrigées seulement en Next 15+ — à traiter lors de l'audit final.
