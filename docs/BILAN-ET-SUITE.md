# Markodience : bilan, écarts avec le cahier des charges et suite

Établi le 2026-10-02 à partir du cahier des charges v4, des 8 prompts et du code réel.

## 1. Ce qui est développé, testé et déployé

**Déployé** sur https://markodience.vercel.app (Next.js 16, Supabase, Vercel), paiements en mode test.

| Domaine | État |
|---|---|
| Onboarding 2 étapes, connexion, sessions | Fait, vérifié |
| 7 onglets du cahier + Guide Lives | Faits, vérifiés dans le navigateur |
| Génération IA (identité, piliers, tonalité, ligne éditoriale, audit, lives) | Faite, vérifiée en mode simulé ; vraie clé valide, crédit à ajouter |
| Multi-profils (Gratuit 1, Pro 3, Agence 10), gestion, suppression | Fait, vérifié |
| Paliers, verrouillage UI + API + base (RLS), quotas IA | Fait, 30 contrôles de sécurité automatisés |
| Paiement PayDunya (sandbox) : facture, retour, vérification serveur | Fait, vérifié de bout en bout |
| Espace administrateur, accès propriétaire sans limite | Fait, vérifié |
| Thème par marque, logos adaptatifs, design premium, animations, accueil, FAQ | Fait |
| Sécurité : RLS, en-têtes (CSP, HSTS…), secrets, dépendances (0 vulnérabilité) | Fait, vérifié en production |
| Tests | 71 tests unitaires + 30 contrôles de sécurité rejouables (`npm run test:security`) |

## 2. Écarts avec le cahier des charges

### Promesses affichées mais non construites (à traiter en priorité)
- **Marque blanche** et **export multi-clients groupé** (palier Agence) : annoncés sur la page des tarifs, absents du produit.
- **Sièges Agence** : facturés par siège, mais aucun moyen d'inviter des collaborateurs (un seul compte se connecte).
- **Exports du palier Gratuit** (« exports avec filigrane ») : seul l'export KPI existe, et l'onglet KPI est réservé au Pro. Le filigrane n'est donc jamais visible. Il manque un export PDF de la stratégie (identité, piliers, tonalité, ligne éditoriale).
- **Support prioritaire** (Agence) : aucun canal de contact n'existe dans le produit.

### Manques fonctionnels du compte
- Mot de passe oublié, paramètres du compte (nom, téléphone, mot de passe), suppression du compte.
- Modification d'une marque après création (nom, logo, couleur).
- Historique des paiements et avertissement avant expiration d'un abonnement.

### Obligations avant ouverture publique
- Pages légales : conditions générales, politique de confidentialité (RGPD), mentions légales.
- Favicon Markodience (celui de Next.js est encore en place), image de partage, plan du site, robots.
- E-mails transactionnels fiables (SMTP dédié) : la limite d'envoi de Supabase est de quelques messages par heure.

### Phase 2 et 3 du cahier non réalisées
- Rappels e-mail (échéance KPI), mode faible connectivité / hors-ligne, modèles de messages en français facile et inclusif.
- Guide Lives : délai de réponse recommandé sur les scripts, adaptation de la trame par plateforme.
- Questionnaire : question 8 (charte existante, upload facultatif) ; secteur avec champ libre « Autre ».
- Remise associations / ONG (-30 à -40 %) : aucun mécanisme (le propriétaire peut offrir un palier à la main).
- Routage Haiku 4.5 pour réduire le coût IA ; intégrations (Canva, Meta, Slack), historique de versions, alertes de bad buzz, Stripe, tarification EUR.

### Écart de décision (assumé)
- CinetPay remplacé par **PayDunya** (décision du propriétaire).

## 3. Suite recommandée

1. Ajouter le crédit Anthropic, puis tester une vraie génération.
2. Acheter le domaine, le brancher (voir §4).
3. Construire le lot « avant ouverture » : mot de passe oublié, paramètres du compte, modification de marque, pages légales, favicon et SEO, historique des paiements, avertissement d'expiration.
4. Aligner la page des tarifs : construire la marque blanche / les exports, ou les marquer « bientôt ».
5. Brancher un SMTP dédié (Resend ou Brevo) et activer PayDunya en production (validation du compte marchand, URL du webhook).
6. Bêta fermée avec 5 à 10 community managers, puis ajustements.
7. Ouverture publique, suivi (monitoring des erreurs, sauvegardes de la base).
8. Chantiers suivants : invitations d'équipe (sièges Agence), exports PDF de stratégie, rappels e-mail, mode hors-ligne.

## 4. Nom de domaine le moins cher

Disponibilité observée (WHOIS, à confirmer chez le registrar) : markodience.com, .io, .co, .net, .sn semblent libres.

Un .com coûte environ 9 à 11 dollars par an (6 000 à 7 000 FCFA). Les prix promotionnels du premier exercice se paient souvent au renouvellement.
- Cloudflare Registrar : prix coûtant, sans marge, renouvellement identique, protection WHOIS gratuite. Le moins cher à long terme.
- Porkbun : environ 10 à 11 dollars, renouvellement identique.
- Namecheap : 6 à 8 dollars la première année avec un code promo, puis 15 à 18 dollars.

Branchement à Vercel :
1. Vercel > projet > Settings > Domains > Add : `markodience.com`.
2. Chez le registrar, créer les enregistrements DNS indiqués par Vercel (A pour la racine, CNAME `cname.vercel-dns.com` pour `www`), en « DNS seul » si Cloudflare.
3. Mettre à jour : variable `NEXT_PUBLIC_APP_URL`, URL du site et URLs de redirection dans Supabase, adresse du webhook dans PayDunya.
