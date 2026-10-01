# Markodience — Suivi d'avancement

Ordre : suivre les 8 prompts de `markodience-8-prompts-claude-code.md`, sans pause entre eux.
Reprise après coupure : lire ce fichier, repartir de « Étape en cours ».

## Terminé
- [x] Étape 1 — Socle : Next.js 14, tokens de design, Navbar glass, clients Supabase, middleware d'auth, migration initiale (`supabase/migrations/20261001000100_init_schema.sql`), `.env.example`. Build + lint + typecheck OK.

## Étape en cours
- Étape 2 — Onboarding en 2 étapes (inscription, profil de marque, redirection dashboard vide).

## En attente côté utilisateur
- Appliquer la migration sur Supabase (méthode à confirmer).
- ANTHROPIC_API_KEY : clé présente, crédit à ajouter (5 $ prévus le 2026-10-02).
- CinetPay : identifiants sandbox.

## Décisions
- Anthropic : modèle `claude-sonnet-5-5` (le prompt dit `claude-sonnet-5`).
- Table `audits` ajoutée au schéma initial (absente du prompt 1).
- Paiement derrière une interface `PaymentProvider` (CinetPay en V1).
- Next 14.2.35 : `npm audit` signale des vulnérabilités corrigées seulement en Next 15+ — à traiter lors de l'audit final.
