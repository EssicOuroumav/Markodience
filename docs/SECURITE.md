# Revue de sécurité de Markodience (essai de la méthode « revue à la conception »)

Faite le 2026-10-19 sur le code et la base de production (lecture seule), après les lots A à E et le durcissement d'exploitation. Chaque affirmation cite sa preuve (fichier, test ou commande). Ce qui n'a pas été vérifié est dit à la fin.

## 1. Ce qu'il faut protéger
| Actif | Où | Pourquoi |
|---|---|---|
| Comptes et identifiants | Supabase Auth | prise de contrôle d'un compte = accès à toutes ses marques |
| Données des marques (identité, cibles, calendrier, indicateurs) | 32 tables Supabase | confidentialité entre clients |
| Abonnements et paiements | `subscriptions`, `payments` | gain de palier sans payer |
| Crédit d'IA (coût réel) | compte du fournisseur d'IA | une facture que le propriétaire paie |
| Fichiers (logos, médiathèque, audits) | 3 espaces de stockage | documents de clients |
| Rôle propriétaire (accès complet, sans quota) | `app_metadata.role` | le plus puissant du système |

## 2. Frontières de confiance
- **Navigateur → Supabase directement** (clé publique) : la sécurité de chaque ligne (RLS) est la **seule** barrière ; il n'y a pas de serveur intermédiaire. → 32 tables sur 32 ont la RLS (vérifié dans les migrations) ; `test:security` (100 contrôles) tente les accès croisés.
- **Navigateur → serveur Next** (`/api/*`, session obligatoire sauf liste blanche) : `lib/paths.ts` ; `test:access` (68 contrôles).
- **Tiers sans compte** (validateur, prestataire de paiement, planificateur) : liens secrets, webhook revérifié, secret de tâche.
- **Serveur → services externes** : IA, PayDunya, Resend, Sentry. Aucun appel vers une adresse saisie par un utilisateur (recherche `fetch(` : seulement PayDunya) → pas de SSRF.

## 3. Points d'entrée publics (sans session)
| Route | Protection | Preuve |
|---|---|---|
| `/`, `/login`, `/signup`, pages légales, robots, sitemap | publiques par conception | `check:launch` |
| `/validation/<lien>` et `POST /api/validation/decide` | jeton de 256 bits (empreinte seule en base), page neutre pour lien faux/expiré/désactivé, limite 120 / 10 min par IP | `test:access` (rafale → 404 puis 429) |
| `POST /api/payments/webhook` | statut relu chez le prestataire (jamais cru), limite 300 / 10 min, exclu du pare-feu | `test:security`, 160 requêtes sans 429 |
| `GET /api/cron/*` | secret comparé à temps constant, 401 sinon, exclus du pare-feu | `test:access`, relecture du code |
| `GET /api/health` | ne dit que « ok », cache 15 s chez Vercel | vérifié en ligne (`x-vercel-cache: HIT`) |
| `GET /auth/callback`, `/payment/return` | destination en liste blanche / origine du site | relecture du code |

## 4. Menaces (STRIDE) et état
| Menace | Protection en place | Risque restant |
|---|---|---|
| **Usurpation** : se faire passer pour un autre | Auth Supabase ; rôle propriétaire écrit seulement par clé de service ; aucun compte de démonstration | Limites de connexion de Supabase **non vérifiées** (voir F2) |
| **Falsification** : modifier les données d'un autre | RLS sur 32 tables ; plan/rôle non modifiables par le client ; contraintes en base (couleur, adresses) | Faible |
| **Répudiation** : nier une action | Historique des validations (`post_reviews`), journal des paiements, Sentry | Faible |
| **Divulgation** : lire les données d'un autre | RLS, liens signés pour les fichiers privés, export de compte par la session de l'utilisateur | Sauvegardes locales contiennent des données personnelles (documenté) |
| **Déni de service** | Réseau de Vercel, règle de pare-feu 120/min, limiteur partagé, santé en cache | Un blocage d'adresse vaut pour tout le site 1 min (voulu) |
| **Élévation de privilèges** | `/api/admin/action` répond 404 aux autres ; palier verrouillé par politiques restrictives | Faible |
| **Injection / script** | Contenu généré affiché en texte ; adresses limitées à http/https ; e-mails échappés (`esc()`) ; fiche : lecture nettoyée (`readBrandInfo`) | CSP autorise `'unsafe-inline'` (F3) |
| **Abus de coût (IA)** | Connexion + quota par jour, rejeu sans double débit, limite de rafale par utilisateur, plafond atomique par plan et par étape | Faible (F1 corrigé) |
| **Chaîne d'approvisionnement** | `npm audit` : 0 faille ; Dependabot ; CI | Détection de secrets GitHub non activée (F7) |

## 5. Constats nouveaux, par gravité
- **F1, moyen (corrigé) : le plafond de relances des étapes du plan n'était pas atomique.** `lib/plan/handler.ts` vérifiait le nombre de relances (`stage_runs`) *avant* l'appel à l'IA et ne l'incrémentait *après* ; les étapes autres que « start » ne coûtent aucun crédit. **Confirmé par un test** (`lib/plan/handler.race.test.ts`) : 12 demandes simultanées lançaient 12 générations au lieu de 2. *Correction* : plafond partagé et atomique par plan et par étape (limiteur existant, 3 fois le plafond pour ne pas gêner les essais après un échec) ; le test passe de 12 générations à 6 au plus, et le plafond exact reste appliqué aux demandes successives.
- **F2, faible à moyen : connexion, inscription, « mot de passe oublié »** passent directement du navigateur à Supabase ; notre limiteur ne les voit pas. Leurs limites n'ont pas été relues, et l'envoi d'e-mails de Supabase est très limité en offre gratuite (un abus sur « mot de passe oublié » peut bloquer les e-mails de tous). *À faire (propriétaire)* : vérifier *Authentication → Rate Limits*, brancher Resend en SMTP.
- **F3, faible : CSP `script-src 'self' 'unsafe-inline'`.** Compromis courant avec Next ; aucun défaut d'injection trouvé, mais un tel défaut serait exécutable. *Plus tard* : CSP à jeton (nonce).
- **F4, faible : `logo_url` et les listes `socials`/`links` n'ont pas de contrainte en base** (couleur, site web et lien de visuel en ont). Atténué : la lecture de la fiche nettoie les adresses et la CSP limite les images à `*.supabase.co`. *Option* : ajouter les contraintes en base (défense en profondeur).
- **F5, faible (réglé) : le lien de validation retombait sur l'origine de la requête** si `NEXT_PUBLIC_APP_URL` manquait. La variable est maintenant définie en production (effective depuis le dernier déploiement).
- **F7, process : détection de secrets GitHub et domaine d'envoi (SPF/DKIM) non activés** (actions du propriétaire).

## 6. Ce que la revue a confirmé (rien à faire)
RLS partout ; clé de service absente du navigateur ; routes planifiées et webhook correctement protégés ; redirections en liste blanche ; e-mails échappés ; espaces de stockage limités en taille et en type (SVG exclu du public) ; aucune faille connue dans les dépendances ; limitation de débit en place.

## 7. Ce que cette revue n'a pas couvert
Pas d'essai d'intrusion externe (OWASP ZAP à faire) ; pas de test avec la vraie IA ni de paiement réel ; comportement de Supabase Auth non audité ; appareils et navigateurs réels non testés ; relecture du code limitée aux points listés (pas de relecture ligne à ligne des 600 fichiers).
