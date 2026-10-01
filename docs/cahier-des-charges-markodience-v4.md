# Cahier des charges — Markodience
**Version 4.0 — Marché de lancement : Afrique de l'Ouest francophone**
**Mise à jour post-validation terrain (10 interviews CM, août 2026)**

---

## 1. Identité du produit

**Nom** : Markodience (contraction de "Marque" + "Audience")
**Domaine** : markodience.com (à réserver immédiatement, variantes .io/.app en précaution)

**Vision** : plateforme web destinée aux community managers (aspirants et confirmés) permettant de structurer stratégiquement la gestion de marque : identité, piliers de contenu, ligne éditoriale, audit et reporting — sans gestion de publication automatique ni connexion API aux réseaux sociaux en V1.

**Ce que le produit n'est pas** : ce n'est pas un outil de planification/publication automatisée type Buffer ou Hootsuite. C'est un outil de structuration stratégique et de pilotage, assisté par IA.

---

## 2. Cibles utilisateurs

| Segment | Profil | Besoin dominant |
|---|---|---|
| Aspirant CM / entrepreneur solo | Gère 1 marque (la sienne ou son premier client) | Être guidé, structurer sans expertise préalable |
| CM confirmé multi-clients | Gère plusieurs marques clientes | Capacité, gain de temps, reporting professionnel |

---

## 3. Modèle économique

### 3.1 Paliers de prix (marché CI/WAEMU, à valider par interviews)

- **Gratuit** — 0 XOF — 1 profil de marque — Identité de marque + piliers de contenu, pas d'audit, exports avec watermark.
- **Pro** — 12 000 XOF/mois — jusqu'à 3 profils — Audit complet, lignes éditoriales multi-plateformes, Guide Lives (structure, équipe, scripts), workflow de validation, KPI/reporting, exports sans watermark.
- **Agence** — 18 000 XOF/utilisateur/mois, minimum 2 sièges — profils illimités — Marque blanche dashboard, support prioritaire, export multi-clients groupé.

**Validation terrain (10 interviews, août 2026)** : le prix Pro à 12 000 XOF est confirmé par la donnée — 7 répondants sur 10 le jugent correct, avec un prix spontané moyen de 11 430 FCFA sur ce sous-groupe. Le palier Agence a été converti d'un forfait plat (40 000 XOF) à un modèle par siège, sur la base du retour d'un profil agence raisonnant en coût par poste utilisateur (20-25 000 FCFA/poste).

**Politiques complémentaires (pas de nouveaux paliers publics)** :
- Tarif réduit associatif/ONG : -30 à -40% sur le palier Pro, sur justificatif de statut associatif.
- Facturation annuelle sur devis pour les structures publiques/institutionnelles, pour s'adapter aux procédures d'achat public.
- Mode faible consommation de données : traité comme exigence produit (voir section 6.4), pas comme réduction tarifaire.

### 3.2 Paiement

- **Processeur V1** : CinetPay (mobile money Orange Money, MTN MoMo + carte bancaire), couverture Afrique de l'Ouest francophone.
- **Devise V1** : XOF exclusivement.
- **Phase 2 (post-traction)** : ajout Stripe pour cartes internationales, activation marché Europe/Canada, tarification en EUR adaptée au marché.

---

## 4. Guide de design

### 4.1 Palette de couleurs (inspirée Apple.com)

| Rôle | Couleur | Usage |
|---|---|---|
| Fond principal | `#FFFFFF` | Pages, cartes principales |
| Fond secondaire | `#F5F5F7` | Sections alternées, sidebar |
| Texte principal | `#1D1D1F` | Titres, corps de texte |
| Texte secondaire | `#6E6E73` | Légendes, métadonnées |
| Accent interactif | `#0071E3` | Boutons, liens, éléments actifs — seule couleur chromatique de l'interface |
| Bordures/dividers | `#D2D2D7` | Séparateurs discrets |
| Succès | `#34C759` | Statut "terminé" |
| Attention | `#FF9F0A` | Statut "en cours" |

**Principe directeur** : un seul accent coloré (le bleu) porte toute l'interactivité de l'interface. La couleur propre à la marque du client (logo, palette) reste cantonnée aux zones "profil de marque" (dashboard, exports), jamais mêlée aux éléments d'interface eux-mêmes.

### 4.2 Typographie

- Police : Inter (libre de droits, proche visuellement de SF Pro) avec fallback système `-apple-system, BlinkMacSystemFont`.
- Titres : poids 600, tracking légèrement négatif (-0.02em). Tailles : Hero 56px / H1 40px / H2 28px / H3 22px.
- Corps : poids 400, 17px, line-height 1.5 — jamais en dessous de 15px.
- Légendes/métadonnées : 13px, poids 400, couleur texte secondaire.

### 4.3 Composants

- Boutons principaux : forme pilule (rayon 980px), fond `#0071E3`, texte blanc.
- Boutons secondaires : rayon 12px, contour fin, fond transparent.
- Cartes : rayon 20-28px, ombre très légère uniquement au survol, jamais d'ombre lourde par défaut.
- Espacement : 24-32px entre blocs de contenu, 8-12px entre éléments proches d'un même groupe.

### 4.3bis Navbar et éléments flottants — glassmorphism clair

Appliqué à la navbar principale et à tout élément flottant au-dessus du contenu (menu déroulant de sélection de canal, sélecteur de profil de marque) :

```
background: rgba(255, 255, 255, 0.75)
backdrop-filter: blur(20px)
-webkit-backdrop-filter: blur(20px)
border-bottom: 1px solid rgba(0, 0, 0, 0.06)
```

L'effet reste subtil — une texture de profondeur, pas un habillage visuel dominant. Liens et logo en `#1D1D1F`, cohérents avec la palette générale. Ne pas appliquer ce traitement aux tableaux de données (KPI, résultats d'audit), qui restent en fond plein pour garantir la lisibilité.

### 4.4 Principes ergonomiques

- Clarté avant tout : chrome d'interface discret, le contenu prime.
- Labels d'action explicites, verbes précis ("Générer le plan éditorial", jamais "Soumettre").
- Aucun écran vide sans message ni action proposée.
- Accessibilité : focus clavier visible, contrastes suffisants, responsive mobile testé systématiquement.

---

## 5. Écrans de l'application

### 5.1 Inscription — Étape 1 (informations personnelles)
Fond blanc, formulaire centré (max-width ~440px), champs : nom, email, mot de passe, téléphone. Bouton pilule bleu "Continuer" en pleine largeur du formulaire.

### 5.2 Inscription — Étape 2 (profil de marque)
Choix freelance / organisation (toggle), champ nom de marque, zone de dépôt de logo (drag & drop), sélecteur de couleur principale (color picker), secteur d'activité (liste déroulante). Bouton "Créer mon espace".

### 5.3 Dashboard (vue principale)
Barre latérale gauche fixe avec les 7 onglets dans l'ordre : Identité de marque, Audit, Piliers de contenu, Tonalité & voix, Ligne éditoriale, KPIs & Reporting, Règles opérationnelles. En-tête reprenant le logo et la couleur de la marque active. Sélecteur de profil en haut à droite pour basculer entre les marques gérées par l'utilisateur.

### 5.4 Identité de marque
Trois cartes horizontales sur fond `#F5F5F7` : Positionnement / Cibles prioritaires / Palette visuelle obligatoire. Contenu généré par IA à l'ouverture initiale, éditable en un clic sur chaque carte (mode édition inline).

### 5.5 Audit
Zone de dépôt de fichiers/captures en haut de page. Bouton pilule "Lancer l'audit". Résultat affiché en composants React structurés (cartes de score, points forts, points d'amélioration) — jamais de HTML brut injecté. Historique des audits précédents en liste chronologique en bas de page.

### 5.6 Piliers de contenu
Grille de cartes (une par pilier, 3 à 5 générés automatiquement). Chaque carte : titre, description courte, exemples de formats. Bouton "+" pour ajouter un pilier manuellement.

### 5.7 Tonalité & voix éditoriale
Deux colonnes côte à côte : "On dit / On fait" (fond vert doux `#34C759` à 10% d'opacité), "On évite / On ne fait pas" (fond rouge doux). Listes à puces éditables.

### 5.8 Ligne éditoriale (par canal)
Sous-onglets horizontaux par canal actif (Facebook, Instagram, TikTok, etc.). Vue type tableau/kanban organisée par semaine, chaque entrée affichant thème, type de contenu, format, fréquence, heure suggérée, et un badge de statut coloré (à venir = gris, en cours = orange, terminé = vert), modifiable par clic. **Workflow de validation** : chaque entrée peut être marquée "en attente de validation", avec horodatage et nom du validateur enregistrés automatiquement — visible en survol du badge de statut, sans écran séparé.

### 5.9 KPIs & Reporting
Formulaire mensuel simple en haut de page. Indicateur visuel de compte à rebours avant l'échéance de soumission. Bouton d'export PDF en bas de page. Historique des rapports précédents accessible en liste.

### 5.10 Règles opérationnelles du CM
Accordéon vertical par section : Planning & publications, Production visuelle, Gestion de communautés, Reporting, Confidentialité & RGPD, Sujets à ne jamais aborder. Texte libre éditable dans chaque section dépliée.

### 5.11 Guide Lives (onglet conditionnel — palier Pro)
Visible uniquement si le CM active le format "Live" sur au moins un canal (Facebook, Instagram, TikTok, YouTube). Le CM sélectionne d'abord un **objectif de live** parmi : Vente, Formation, Information/Annonce, Promotion, Échange thématique avec l'audience — cet objectif conditionne le contenu généré dans les trois sous-sections ci-dessous. Un même profil peut créer plusieurs guides de live, un par objectif.

- **Structure du live** : trame générée par IA, propre à l'objectif choisi (ex. Formation : introduction, démonstration, session de questions ; Vente : présentation d'offre, clôture ; Information : contexte, annonce, appel à l'action), adaptable par plateforme, éditable.
- **Organisation de l'équipe** : cartes par membre d'équipe (rôle, canal en charge, créneau de rotation), généré selon le nombre de personnes déclarées par le CM — indépendant de l'objectif du live.
- **Scripts opérationnels** : bibliothèque de scripts type par situation (premier message entrant, redirection, relance, clôture), déclinée selon l'objectif sélectionné — un script de vente, de suivi de formation ou de réponse informative n'ont pas la même logique. Personnalisables, avec repère visuel du délai de réponse recommandé.

---

## 6. Architecture fonctionnelle générale

### 6.1 Gestion multi-profils
Un utilisateur peut créer plusieurs profils de marque depuis son compte. Chaque profil est indépendant (données, audits, lignes éditoriales propres). Le dashboard adopte dynamiquement l'identité visuelle (logo + couleur) du profil actif.

### 6.2 Génération IA par onglet
- **Identité de marque, Piliers de contenu, Tonalité & voix** : génération initiale par Claude Sonnet 5 à partir d'un questionnaire structuré, entièrement éditable ensuite.
- **Audit** : analyse de fichiers/captures par Claude Sonnet 5, rendu en composants structurés.
- **Ligne éditoriale** : proposition de trame automatique sur la durée choisie (1 à 3 mois), à partir des piliers et de la tonalité définis.
- **Guide Lives** (Pro) : génération de trame de live, de répartition de rôles d'équipe et de scripts opérationnels, adaptée à l'objectif du live choisi par le CM (vente, formation, information, promotion, échange thématique).

### 6.3 Mécanisme détaillé — génération des lignes éditoriales

1. **Sélection du canal** : menu déroulant au clic sur l'onglet Ligne éditoriale, listant les canaux actifs de la marque, avec option "+ Ajouter un canal".
2. **Distribution des piliers dans le temps** : les piliers de contenu (3 à 5) sont répartis en rotation sur les semaines de la période choisie, pour garantir cohérence et diversité — jamais un seul pilier étiré sur tout le mois, jamais un contenu déconnecté des piliers.
3. **Adaptation au format du canal** : le format suggéré (texte, image, vidéo courte, live) s'ajuste automatiquement selon le canal sélectionné, à thème constant.
4. **Génération de la trame hebdomadaire** : pour chaque semaine, génération d'un thème dérivé d'un ou deux piliers, avec type de contenu, fréquence et heure suggérée.
5. **Édition libre** : réorganisation de l'ordre, modification d'un thème, ou régénération d'une semaine précise sans réinitialiser l'ensemble.

### 6.4 Exigence de connectivité

Confirmé par interview terrain (zone rurale, région de Man) : une partie de la cible hors Abidjan opère avec une connexion internet faible ou instable. Exigence Phase 2 : interface allégée en consommation de données, possibilité de préparer du contenu hors-ligne (mise en cache locale) puis synchronisation à la reconnexion. Ne bloque pas le lancement Phase 1, mais à intégrer dans les choix d'architecture frontend dès le départ pour ne pas fermer la porte à un mode dégradé plus tard.

### 6.5 Backlog de fonctionnalités (issues des 10 interviews, non retenues pour la V1)

| Fonctionnalité | Origine | Statut |
|---|---|---|
| Banque de réponses rapides en un clic pendant les lives | Aïcha, Prisca | Intégrée au Guide Lives (section 5.11) |
| Workflow de validation avec historique | Yves-Marie, Fatoumata, Nathalie, Jean-Baptiste | Intégrée à la Ligne éditoriale (section 5.8) |
| Mode faible connectivité / hors-ligne | Amadou | Phase 2 (section 6.4) |
| Export calendrier vers Canva / Meta Business Suite | Yves-Marie | Phase 3 — intégrations |
| Historique de versions du positionnement | Yves-Marie | Phase 3 |
| Alerte bad buzz / commentaire sensible | Fatoumata | Phase 3 |
| Intégration Slack | Fatoumata | Phase 3 |
| Modèles de messages en français facile/inclusif | Serge | Phase 2 — accessibilité |
| Module de gestion d'avis clients multi-plateformes (Google, TripAdvisor) | Koffi | Hors périmètre — extension verticale secteur hôtellerie, à évaluer séparément |
| Synchronisation temps réel du stock de biens | Marie-Claire | Hors périmètre — extension verticale secteur immobilier, à évaluer séparément |
| Banque de visuels adaptés au contexte local (teintes de peau, tenues, FCFA) | Aïcha | Phase 3 |

---

## 7. Modèle de données (schéma simplifié)

```
users
  id, email, password_hash, phone, created_at

brand_profiles
  id, user_id (FK), name, sector, logo_url, primary_color, status (freelance/organisation), created_at

brand_identity
  id, brand_profile_id (FK), positioning, target_segments (json), visual_palette (json), marketing_objectives (json)

audits
  id, brand_profile_id (FK), source_files (json), report_data (json), created_at

content_pillars
  id, brand_profile_id (FK), name, description, examples (json)

tone_voice
  id, brand_profile_id (FK), do_list (json), dont_list (json)

editorial_lines
  id, brand_profile_id (FK), channel, period_start, period_end

editorial_entries
  id, editorial_line_id (FK), week_number, theme, content_type, format, frequency, suggested_time, status, validation_status, validated_by, validated_at

kpi_reports
  id, brand_profile_id (FK), month, data (json), submitted_at, deadline

operational_rules
  id, brand_profile_id (FK), section, content

subscriptions
  id, user_id (FK), plan (gratuit/pro/agence), payment_provider, status, renewal_date
```

---

## 8. Stack technique

| Couche | Choix | Justification |
|---|---|---|
| Frontend | Next.js 14 (React) | Flexibilité, écosystème mature, compatible Vercel |
| Backend / DB | Supabase (PostgreSQL, Auth, Storage) | RLS natif pour isolation des données par utilisateur/profil |
| Hébergement | Vercel | Déploiement continu, intégration native Next.js |
| IA | Claude Sonnet 5 (génération stratégique), Claude Haiku 4.5 (extraction/classification) | Routage par tâche pour optimiser le coût |
| Paiement | CinetPay (V1), Stripe (Phase 2) | Couverture mobile money Afrique de l'Ouest francophone |
| Génération assistée du code | Claude Code | Copilote de développement |

---

## 9. Roadmap de lancement

### Phase 1 — MVP marché CI/WAEMU
Onboarding 2 étapes + gestion multi-profils. Onglets : Identité de marque, Piliers de contenu, Tonalité & voix. Paiement CinetPay, paliers Gratuit/Pro.

### Phase 2 — Enrichissement (priorités confirmées par 10 interviews terrain)
Onglet Audit (upload + rapport structuré). Ligne éditoriale multi-canal avec statuts et workflow de validation. Guide Lives (structure, équipe, scripts, banque de réponses rapides) — demande confirmée par la moitié du panel interviewé. KPI & Reporting avec rappels. Mode faible connectivité. Modèles de messages français facile/inclusif.

### Phase 3 — Extension marché
Palier Agence par siège, facturation sur devis pour le secteur public. Intégration Stripe. Activation marché Europe/Canada, tarification EUR. Intégrations avancées (export Canva/Meta Business Suite, historique de versions, alertes, Slack).

---

## 10. Risques identifiés

| Risque | Niveau | Mitigation |
|---|---|---|
| Sous-estimation du temps d'apprentissage Next.js/Claude Code | Élevé | Jalon de test à 3 semaines (1 profil + 1 onglet fonctionnel) |
| Coût API incontrôlé sur plan Gratuit | Modéré | Quotas de génération stricts par palier |
| Prix mal calibré vs pouvoir d'achat réel | Modéré | Validation par interviews avant lancement, ajustable ±30% |
| Rendu d'audit non sécurisé si mal implémenté | Modéré | Rendu en composants React structurés, jamais de HTML brut injecté |

---

## 11. Annexe — Questionnaire structuré d'onboarding (alimente la génération IA)

Ce questionnaire est rempli par l'utilisateur lors de la création d'un profil de marque (ou modifiable ensuite depuis l'onglet Identité de marque). Ses réponses servent de contexte à Claude Sonnet 5 pour générer le positionnement, les cibles, les piliers de contenu et la tonalité.

1. **Nom de la marque ou de l'entreprise**
2. **Secteur d'activité** (liste déroulante + champ libre si "Autre")
3. **En une phrase, que vend ou propose cette marque ?**
4. **Qui sont les clients actuels ou visés ?** (âge, situation, besoin principal — jusqu'à 3 segments)
5. **Quel problème cette marque résout-elle pour ses clients ?**
6. **Qu'est-ce qui différencie cette marque de ses concurrents ?**
7. **Trois mots qui décrivent la personnalité de la marque** (ex. rigoureux, chaleureux, audacieux)
8. **Y a-t-il des couleurs, un logo ou une charte déjà existants ?** (upload optionnel)
9. **Quel est l'objectif principal des réseaux sociaux pour cette marque ?** (notoriété / conversion / fidélisation / recrutement)
10. **Sur quels canaux la marque est-elle déjà présente ou souhaite-t-elle être présente ?**
11. **Y a-t-il des sujets ou formulations à éviter absolument ?** (champ libre)

**Usage technique** : les réponses sont stockées dans `brand_profiles` et `brand_identity` (champs correspondants), puis injectées comme contexte dans le prompt système envoyé à Claude Sonnet 5 lors de la première génération de l'onglet Identité de marque.

---

*Document de travail — à ajuster au fil des interviews utilisateurs et des décisions de conception.*
