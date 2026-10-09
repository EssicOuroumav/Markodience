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

- [x] Animations (respectent « réduire les animations ») : apparition au défilement (`Reveal`), entrée en cascade des pages et des cartes (`template.tsx`), squelettes de chargement (`loading.tsx`), orbes dérivants, titre à dégradé animé, reflet des boutons, anneaux de score qui se remplissent, illustrations vivantes, pages de connexion animées. Bloc de la marque cliquable → /dashboard, plus élégant (liseré à la couleur de la marque), sélecteur de marque avec logos. Onglet Règles : aides par section + modèles à insérer.

- [x] Ajout de marques : page « Mes marques » (compteur utilisé/limite, une carte par marque, ouverture en un clic, suppression avec saisie du nom, carte « Ajouter une marque » ou « Limite atteinte »), page de création `/dashboard/brands/new` (formulaire partagé `BrandForm`), liens dans le sélecteur et la barre latérale. Vérifié (création, suppression, marque active).
- [x] Barre latérale refondue : tuiles d'icônes, coches de progression par onglet, progression de la stratégie dans la carte de la marque, sections « Votre marque » / « Gestion », compteur de marques, pastille « Pro » sur les onglets verrouillés. `getDashboardContext` et `getBrandProgress` mis en cache par requête.
- [x] Accueil : en-tête plein cadre avec la photo du propriétaire en fond (public/photos/hero-bg.jpg, 179 Ko, retournée horizontalement pour dégager les deux visages, dégradé sombre pour la lisibilité), texte en bas à gauche, maquette et pastilles à droite (masquées sur mobile) ; `lib/photos.ts` : hero = photo. Illustrations de community managers conservées dans la section « Pour qui » et en repli.
- [x] (historique) Accueil : illustrations de community managers dessinées (`components/people.tsx` : héroïne, aspirante, confirmé, équipe) dans l'en-tête et la section « Pour qui ». Pour utiliser de vraies photos plus tard : déposer les fichiers dans public/photos/ puis renseigner `lib/photos.ts` (l'illustration sert de repli).

- [x] FAQ de l'accueil refaite : 18 questions en 4 thèmes (Découvrir, Fonctionnement, Tarifs et paiement, Marques et données), `lib/faq.ts` (prix, quotas et limites lus dans `lib/plans.ts`), accordéon animé accessible (une réponse ouverte à la fois), données structurées schema.org FAQPage, 6 tests. À COMPLÉTER par le propriétaire : un moyen de contact (email ou WhatsApp) pour les remises ONG/associations et les devis publics.

- [x] Thème par marque : `lib/theme.ts` dérive la palette d'accentuation (accent, strong, light, soft) de la couleur principale de la marque active, avec contraste ≥ 4,5:1 garanti avec le texte blanc ; appliquée en variables CSS sur le conteneur du tableau de bord (sidebar, onglet actif, boutons, barres, anneaux, illustrations, fond teinté) ; l'export PDF KPI prend aussi la couleur de la marque ; 10 tests. Le bleu Markodience reste sur l'accueil, l'authentification et l'espace admin. Vérifié visuellement (émeraude, violet).

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

## Lot « avant ouverture » (2026-10-01)
Fait et vérifié (build de production, compte jetable supprimé ensuite) :
- Mot de passe oublié + réinitialisation (/forgot-password, /reset-password), redirections sûres (`safeNext`).
- Mon compte (/dashboard/account) : nom, téléphone, mot de passe, export JSON des données, suppression du compte (phrase SUPPRIMER + mot de passe, purge des fichiers).
- Modification d'une marque (nom, secteur, logo, couleur) : le thème suit la couleur.
- Pages légales (CGU, confidentialité, mentions légales) + pied de page ; consentement enregistré à l'inscription.
- SEO : favicon/icônes Markodience, image de partage, sitemap, robots, métadonnées.
- Historique des paiements, bandeau d'expiration d'abonnement (≤ 7 jours / expiré).
- Promesses Agence non construites marquées « (bientôt) » ; script `npm run check:launch`.
Tests : 81 unitaires, 30 contrôles de sécurité, lint et typecheck propres.
À faire par le propriétaire : compléter lib/legal.ts, faire relire les textes légaux, domaine, SMTP, PayDunya live.

## Correctifs paiement (2026-10-04)
Test de course (simulateur, compte jetable) : confirmations simultanées et rejeu déjà sûrs ; deux défauts trouvés et corrigés :
renouvellement anticipé qui faisait perdre les jours restants, et double clic créant deux factures. Ajouts : activation du paiement
en une seule transaction SQL (`activate_payment`, migration 20261001000700), index unique « une facture en attente par utilisateur »,
webhook qui répond `ROK` (exigé par PayDunya), incidents de paiement envoyés à Sentry, scripts `rls-smoke.mjs` (contrôles SQL) et
`payments-race.mjs` (bout en bout). **Ordre de mise en ligne : appliquer la migration dans Supabase AVANT de pousser le code.**

## Lot « valeur » (2026-10-09 →)
Décidé avec le propriétaire (analyse identité + site) : fondations et charte, guide de marque PDF, génération des publications, calendrier visuel, rappels e-mail/WhatsApp, bibliothèque de contenus, fonctions Agence. Pas de langues locales pour l'instant (français seul).
- [x] Lot 1 — Identité enrichie : mission, vision, valeurs, promesse, slogan, message clé ; portraits de cibles détaillés (freins, canaux, langue, moment) ; nouvel onglet **Charte graphique** (couleurs reprenant celle de la marque, typographie, règles du logo, style de visuels) ; génération complémentaire `identity_extend` pour les marques existantes (identité inchangée) ; export **Guide de marque (PDF)** (identité, cibles, objectifs, charte, piliers, tonalité ; filigrane en Gratuit). Migration `20261009000100_identity_foundations.sql` (2 colonnes jsonb). Tests : 150.
- [x] Lot 2 — Publications et calendrier : nouvel onglet **Publications** (même palier que la ligne éditoriale) ; génération `posts_week` (légende, idée de visuel, hashtags, appel à l'action pour chaque jour de la semaine, nourrie de la tonalité et des fondations) ; calendrier mensuel (points de statut, filtre par canal), vue liste, édition en place, date, statut Brouillon/Prêt/Publié, copie en un clic, ajout manuel ; les brouillons d'une semaine se remplacent, jamais les publications prêtes ou publiées. Migration `20261009000200_posts.sql` (table `posts`, RLS, verrouillage Gratuit). Export des données et test de sécurité mis à jour. Parcours guidé : 10 étapes.
- [x] Lot 3 — Bibliothèque de contenus (paliers Pro et Agence) : onglet **Bibliothèque** (hors parcours guidé) ; dépôt par glisser-déposer, PNG/JPG/WebP/PDF jusqu'à 10 Mo, 200 fichiers par marque, aperçus par liens temporaires, catégories, renommage, téléchargement, suppression ; dossier privé `library` (RLS par marque, verrou palier et plafond de 200 fichiers côté base) ; fichiers purgés à la suppression d'une marque et du compte. Migration `20261009000300_library.sql`.
- [x] Lot 4 — Rappels par e-mail : règles fixes (rapport KPI du mois dernier à J-2, jour J et J+1 ; publications du jour et du lendemain non publiées ; fin d'abonnement à J-7, J-3, J-1), un message par jour au plus, préférences dans Mon compte, tâche planifiée Vercel quotidienne (`vercel.json`, 08:00 UTC) vers `/api/cron/reminders` protégée par `CRON_SECRET` (`?dry=1` pour simuler), envoi par Resend (`RESEND_API_KEY`, `MAIL_FROM`). Sans clés, rien n'est envoyé. Migration `20261009000400_reminders.sql`. **WhatsApp : abandonné** (décision du propriétaire le 2026-10-09 : les rappels se reçoivent par e-mail). Politique de confidentialité mise à jour (prestataire d'envoi).
- [x] Lot 5 — Fonctions Agence terminées : **marque blanche** (nom de l'agence saisi dans Mon compte, au pied des PDF KPI et guide de marque à la place de « Markodience » ; vide tant qu'il n'est pas renseigné) et **export multi-clients** (page Mes marques : archive ZIP avec, par marque, guide de marque + rapport KPI du mois choisi, plus synthèse CSV protégée contre les formules). Mention « (bientôt) » retirée de l'accueil, des tarifs et de la FAQ. Dépendance ajoutée : jszip. Aucune migration.

## Plan stratégique par l'IA (essai du 2026-10-09)
Objectif du propriétaire : que l'IA produise un plan aussi précis et lisible que `aicha_ui.html` (document de référence, fourni par le propriétaire avec la conversation qui l'a produit).
- Code d'essai : `lib/plan/` (cahier des charges `brief.ts`, faits de calendrier calculés `facts.ts`, phases avant/pendant/après/permanent calculées par le code `calendar.ts`, étapes et consignes `prompts.ts` / `schemas.ts`, enchaînement `pipeline.ts`). Essai réel : `AI_LIVE=1 AI_LIVE_OUT=… npx vitest run lib/plan/spike.live.test.ts` (cache des étapes payées).
- Résultat sur le cas AICHA : 13 appels, 227 s, ≈ 0,43 $, plan complet (identité avec tonalité par registre et réécriture, 6 piliers pondérés = 100 %, 52 semaines avec phases, 3 réseaux avec règles et modèles de posts par phase, 12 leviers organiques, plan KPI, 8 règles, relecture critique notée 72/100).
- Enseignements techniques : les modèles de la famille 5 raisonnent par défaut et épuisent le budget de jetons sur les longues sorties JSON (réponse vide) → option `thinking: "off"` (`between_tools`) réservée au plan ; ne jamais rejeter une réponse pour une longueur ou un nombre d'éléments un peu dépassé (chaque rejet coûte un appel entier) ; dates hégiriennes calculées avec `Intl` (Umm al-Qura) : Ramadan 2027 ≈ 8 février, Aïd el-Fitr ≈ 9 mars, Tabaski ≈ 16 mai (±1 jour).
- Écarts restants par rapport au document de référence : textes 2 à 3 fois plus longs, cadence identique sur les 3 réseaux, un même engagement chiffré avec des délais différents selon les sections (7, 10, 14 jours), slogan inconnu de l'IA.

