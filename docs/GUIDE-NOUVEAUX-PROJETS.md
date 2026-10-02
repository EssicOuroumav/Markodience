# Guide pour lancer un nouveau site web ou une nouvelle application

Tiré de la construction de Markodience (Next.js + Supabase + Vercel + paiement mobile + IA).
Ce document est un plan de route réutilisable : à copier au début de chaque projet et à adapter.

---

## 1. Avant d'écrire une ligne de code

1. **Cahier des charges court (2 à 5 pages)** : le problème résolu, pour qui, les 5 à 8 fonctions du premier lancement, ce qui est volontairement exclu, les paliers de prix. Sans cela, on construit des promesses (marque blanche, exports…) que le produit ne tient pas.
2. **Décisions à trancher d'emblée** (ce sont celles qui coûtent le plus cher à changer) :
   - Qui peut quoi ? (visiteur, utilisateur, propriétaire/admin, équipe)
   - Quels paliers, quels quotas, quel prix, quelle monnaie ?
   - Quel moyen de paiement dans le marché visé (en Afrique de l'Ouest : agrégateur de Mobile Money comme PayDunya ou CinetPay) ?
   - Quelles données personnelles sont collectées (impact légal) ?
3. **Prérequis hors code, à lancer tôt car ils prennent des jours** : nom de domaine, compte marchand du prestataire de paiement (validation), crédit de l'API d'IA, adresse e-mail professionnelle, texte légal.

## 2. Pile technique recommandée (éprouvée)

| Besoin | Choix | Pourquoi |
|---|---|---|
| Site + API | Next.js (App Router), TypeScript | Un seul projet, déploiement simple |
| Base + comptes + fichiers | Supabase (Postgres, Auth, Storage) | RLS intégrée, gratuit au départ |
| Hébergement | Vercel, déploiement auto à chaque push | Zéro serveur à gérer |
| Style | Tailwind, couleurs en variables CSS | Thèmes et marques faciles |
| Validation | zod | Une seule source de vérité des entrées |
| Tests | Vitest + un script de sécurité rejouable | Rattrape les régressions |
| IA | SDK Anthropic, appelé uniquement côté serveur | La clé ne sort jamais du serveur |

Versions : vérifier les changements majeurs du framework avant de coder (Next 16 : `proxy.ts` à la place de `middleware`, `cookies()`/`params` asynchrones, plus de `next lint`).

## 3. Ordre de construction qui a bien marché

1. Squelette + design system (couleurs, composants de base, navbar, pages d'état vide).
2. Base de données + RLS + migrations numérotées.
3. Authentification (inscription, connexion, mot de passe oublié, déconnexion).
4. Cœur métier (la fonction qui justifie le produit).
5. Paliers, quotas, verrouillage des fonctions payantes (interface **et** API **et** base).
6. Paiement (voir §6).
7. Espace administrateur / propriétaire.
8. Lot « avant ouverture » (§8).
9. Bêta fermée, puis ouverture.

Principe : chaque étape se termine par un build qui passe, des tests, une vérification dans le navigateur, un commit.

## 4. Sécurité : la liste non négociable

- **Row Level Security sur toutes les tables**, dès la première migration. Une table sans RLS est publique.
- **Plan et rôle ne se fient jamais au client** : le palier se lit en base (fonctions `SECURITY DEFINER`), le rôle admin vit dans `app_metadata` (modifiable uniquement avec la clé service).
- **Verrouiller à trois niveaux** : interface (masquer), API (refuser), base (politiques RLS restrictives). Un seul niveau ne suffit pas.
- **Clé service Supabase et clés secrètes** : uniquement dans les variables d'environnement serveur, jamais dans `NEXT_PUBLIC_*`, jamais commitées. Vérifier le bundle client après déploiement.
- **Montants recalculés côté serveur** ; ne jamais croire un prix envoyé par le navigateur.
- **Paiement confirmé par vérification serveur à serveur**, jamais par la seule page de retour. Webhook idempotent.
- **Redirections après connexion en liste blanche** (évite les redirections ouvertes).
- **En-têtes** : CSP, HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy.
- **Quotas pour tout ce qui coûte de l'argent** (appels IA) avec remboursement du quota en cas d'échec.
- **Actions destructrices** : phrase à taper + mot de passe.
- **Pas de compte de démonstration laissé en base** ; les comptes de test sont créés et supprimés par script.
- `npm audit` à 0 vulnérabilité avant chaque mise en ligne.

## 5. Pièges rencontrés (à ne pas refaire)

- Écrire du Tailwind v4 dans un projet v3 : vérifier la version d'abord.
- Opacité sur des couleurs en variable CSS : utiliser `rgb(var(--x) / <alpha-value>)`.
- Oublier les `GRANT` et le bucket de stockage dans les migrations.
- Confondre clé anonyme et clé service (les deux ressemblent à des JWT : décoder le champ `role`).
- Coller des clés masquées (astérisques) ou mélanger clés test et production.
- Tester l'interface avec le serveur de développement dans le navigateur intégré (boucle HMR) : **tester sur un build de production**.
- Laisser un mode simulé (`AI_MOCK`, `PAYMENTS_MOCK`) dans `.env.local`.
- E-mails de confirmation Supabase : limite d'envoi très basse et lien expirant (`otp_expired`) → brancher un SMTP dédié (Resend, Brevo) avant l'ouverture.
- Pages publiques oubliées dans le proxy d'authentification (robots, sitemap, image de partage, pages légales) : elles redirigeaient vers la connexion.
- Satori (image de partage) : un `div` ne peut avoir qu'un seul enfant texte.
- Contraste : un blanc sur un vert clair échoue ; calculer la couleur de texte.

## 6. Paiement mobile : méthode

1. Définir une interface `PaymentProvider` (créer la facture, vérifier la facture). Changer de prestataire ne touche alors qu'un fichier.
2. Un mode simulé local pour développer sans argent.
3. Flux : le serveur crée la facture avec un montant recalculé → redirection vers la page du prestataire → retour sur `/payment/return` → le serveur **vérifie** auprès du prestataire → passage `pending → completed` atomique → abonnement activé.
4. Webhook (IPN) idempotent en secours, route publique.
5. Tester en sandbox avec de vrais écrans, puis activer le mode production après validation du compte marchand, et mettre à jour l'URL du webhook.

## 7. Variables d'environnement : modèle

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=      # serveur uniquement
ANTHROPIC_API_KEY=              # serveur uniquement
PAYDUNYA_*                      # serveur uniquement
NEXT_PUBLIC_APP_URL=            # domaine final
```

Règles : `.env.local` dans `.gitignore`, un `.env.example` sans valeur réelle, les variables de production saisies dans Vercel, jamais dans le dépôt.

## 8. Lot « avant ouverture » : liste de contrôle

- [ ] Mot de passe oublié et réinitialisation
- [ ] Page « Mon compte » : modifier ses infos, mot de passe, **exporter ses données**, **supprimer son compte** (purge des fichiers)
- [ ] Modifier / supprimer les objets créés (marques, projets…)
- [ ] Pages légales : CGU, politique de confidentialité, mentions légales (**à faire relire par un juriste**) + consentement enregistré à l'inscription
- [ ] Favicon, image de partage, `sitemap.xml`, `robots.txt`, métadonnées
- [ ] Historique des paiements, avertissement avant expiration
- [ ] Aucune promesse commerciale non construite (sinon « bientôt »)
- [ ] SMTP dédié, domaine branché, redirections Supabase et webhook mis à jour
- [ ] Sauvegardes de la base, suivi des erreurs
- [ ] Script `check:launch` qui vérifie tout cela automatiquement

## 9. Façon de travailler avec Claude Code

- Donner un cahier des charges écrit et demander un **bilan des écarts** à intervalles réguliers.
- Exiger : build vert, tests, vérification visuelle, commit à chaque étape.
- Garder un `docs/PROGRESS.md` mis à jour : il permet de reprendre après une coupure.
- Laisser à l'humain ce qui touche à l'argent, aux comptes et à la production : `git push`, clés, paiements réels, achat du domaine.
- Valider les décisions de produit (prix, paliers, accès propriétaire) **avant** de les coder.
- Un grand lot à la fois, une revue de sécurité avant chaque mise en ligne.

## 10. Coûts de départ (ordre de grandeur)

| Poste | Coût |
|---|---|
| Domaine .com | ≈ 9 à 11 $/an (Cloudflare Registrar, au prix coûtant) |
| Vercel, Supabase | Gratuit au démarrage, payant quand le trafic grandit |
| IA (Sonnet) | ≈ 0,03 à 0,07 $ par génération ; 5 $ ≈ 70 à 150 générations (à vérifier sur la grille tarifaire) |
| Paiement | Commission du prestataire par transaction |
| SMTP | Offre gratuite suffisante au départ |

## 11. Modèle de cahier des charges (à remplir)

1. Nom, promesse en une phrase
2. Public visé, pays, langue, monnaie
3. Les 5 à 8 fonctions du lancement / ce qui est exclu
4. Rôles et permissions
5. Paliers : prix, quotas, fonctions incluses
6. Données collectées et durée de conservation
7. Paiement : prestataire, moyens acceptés
8. Intégrations externes
9. Critères de réussite de la bêta (nombre d'utilisateurs, retours attendus)
10. Calendrier et prérequis hors code

## 12. Après la mise en ligne : exploitation

- **Suivi d'erreurs** : Sentry est déjà branché (voir README). Créez le projet, mettez `NEXT_PUBLIC_SENTRY_DSN` dans Vercel en type « Config » (le DSN est public par conception), puis testez avec une erreur volontaire réservée au propriétaire, à supprimer ensuite. Les « source maps » (code lisible côté navigateur) demandent un jeton `SENTRY_AUTH_TOKEN` et `withSentryConfig` : à ajouter pendant la bêta.
- **Disponibilité** : une sonde gratuite (UptimeRobot, Better Stack) avec alerte par e-mail.
- **Incident** : constater (Sentry, journaux Vercel), limiter (rollback du déploiement dans Vercel), prévenir les utilisateurs, corriger et tester, puis noter la cause.
- **Routine** : chaque jour Sentry et paiements en attente ; chaque semaine coûts IA et retours ; chaque mois `npm audit` et test de restauration d'une sauvegarde.
- **Permissions des outils** : n'autorisez un service (Sentry, etc.) que sur les dépôts dont il a besoin.
