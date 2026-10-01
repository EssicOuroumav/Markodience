# Markodience — Séquence complète des prompts Claude Code

Ce document réunit les 8 prompts à donner à Claude Code, dans l'ordre, pour construire Markodience de bout en bout : onboarding, les 7 onglets du produit, puis la logique de paliers tarifaires.

---

# Premier prompt — Démarrage du projet Markodience (v3 — charte Apple + glassmorphism clair)

Copier-coller ce prompt tel quel dans Claude Code, à la racine d'un dossier vide.

---

Crée un nouveau projet Next.js 14 (App Router) nommé "markodience", avec Supabase comme backend et Tailwind CSS pour le styling. C'est la première étape d'une plateforme web pour community managers.

## 1. Setup initial
- Next.js 14, TypeScript, App Router, Tailwind CSS.
- Connexion Supabase (Auth, Database, Storage) — utilise des variables d'environnement `.env.local` pour l'URL et la clé anonyme, ne les code jamais en dur.
- Structure de dossiers claire : `/app`, `/components`, `/lib/supabase`, `/types`.

## 2. Design system (à respecter strictement dans tous les composants)

Palette :
- Fond principal : `#FFFFFF`
- Fond secondaire : `#F5F5F7`
- Texte principal : `#1D1D1F`
- Texte secondaire : `#6E6E73`
- Accent interactif (unique couleur chromatique de l'interface) : `#0071E3`
- Bordures : `#D2D2D7`
- Succès : `#34C759` / Attention : `#FF9F0A`

Typographie : police Inter (fallback `-apple-system, BlinkMacSystemFont`), titres en poids 600 avec tracking -0.02em, corps de texte 17px/line-height 1.5.

Composants : boutons principaux en forme pilule (`border-radius: 980px`) fond `#0071E3` texte blanc ; boutons secondaires rayon 12px contour fin ; cartes à rayon 20-28px, ombre très légère uniquement au survol.

### Navbar — glassmorphism clair

```
background: rgba(255, 255, 255, 0.75)
backdrop-filter: blur(20px)
-webkit-backdrop-filter: blur(20px)
border-bottom: 1px solid rgba(0, 0, 0, 0.06)
```

Fixe en haut de l'écran, visible en permanence dans le dashboard. Liens de navigation et logo en `#1D1D1F`. L'effet de flou doit rester subtil — c'est une texture de profondeur, pas un habillage visuel dominant. Applique ce même traitement glassmorphism clair à tout élément flottant au-dessus du contenu (menu déroulant de sélection de canal dans Ligne éditoriale, sélecteur de profil de marque en haut à droite) pour une cohérence d'ensemble.

Configure ces tokens comme variables CSS ou dans `tailwind.config.ts`, pas en valeurs codées en dur dans chaque composant.

## 3. Schéma de base de données Supabase

Crée les tables suivantes avec Row Level Security activé (chaque utilisateur ne voit que ses propres données via `user_id` ou via la relation à `brand_profiles`) :

```sql
users -- gérée nativement par Supabase Auth

brand_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  sector text,
  logo_url text,
  primary_color text,
  status text check (status in ('freelance', 'organisation')),
  created_at timestamptz default now()
);

brand_identity (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles not null,
  positioning text,
  target_segments jsonb,
  visual_palette jsonb,
  marketing_objectives jsonb
);

content_pillars (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles not null,
  name text,
  description text,
  examples jsonb
);

tone_voice (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles not null,
  do_list jsonb,
  dont_list jsonb
);

editorial_lines (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles not null,
  channel text,
  period_start date,
  period_end date
);

editorial_entries (
  id uuid primary key default gen_random_uuid(),
  editorial_line_id uuid references editorial_lines not null,
  week_number int,
  theme text,
  content_type text,
  format text,
  frequency text,
  suggested_time text,
  status text check (status in ('a_venir', 'en_cours', 'termine')) default 'a_venir',
  validation_status text check (validation_status in ('non_requis', 'en_attente', 'valide')) default 'non_requis',
  validated_by text,
  validated_at timestamptz
);

kpi_reports (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles not null,
  month date,
  data jsonb,
  submitted_at timestamptz,
  deadline date
);

operational_rules (
  id uuid primary key default gen_random_uuid(),
  brand_profile_id uuid references brand_profiles not null,
  section text,
  content text
);

subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  plan text check (plan in ('gratuit', 'pro', 'agence')) default 'gratuit',
  payment_provider text,
  status text,
  renewal_date date
);
```

Écris les migrations SQL correspondantes dans `/supabase/migrations`.

## 4. Premier écran à construire : onboarding

Construis uniquement l'écran d'inscription en 2 étapes pour l'instant, rien d'autre :

**Étape 1** : formulaire centré (max-width ~440px), champs nom / email / mot de passe / téléphone. Utilise l'auth Supabase par email/mot de passe. Bouton pilule bleu "Continuer".

**Étape 2** : toggle freelance/organisation, champ nom de marque, zone de dépôt de logo (upload vers Supabase Storage), color picker pour la couleur principale, select secteur d'activité. Bouton "Créer mon espace" qui crée l'entrée dans `brand_profiles`.

Formulaires en composants contrôlés React (pas de balise `<form>` native pour la soumission — gère via `onClick`/`onSubmit` avec `preventDefault`).

## 5. Ce que tu ne dois PAS faire à cette étape
- Ne construis aucun autre onglet (Identité de marque, Audit, etc.) pour l'instant.
- N'intègre pas encore l'API Claude ni CinetPay.
- Ne code pas de logique de paiement ou de plan tarifaire.

Une fois l'onboarding fonctionnel de bout en bout (inscription → création de profil de marque → redirection vers un dashboard vide), arrête-toi et attends la prochaine instruction.


---

# Deuxième prompt — Dashboard + Identité de marque + Piliers de contenu + Tonalité & voix

À utiliser une fois l'onboarding (premier prompt) fonctionnel et validé. Copier-coller tel quel dans Claude Code, dans la continuité du même projet.

---

L'onboarding est fonctionnel. On passe à l'étape suivante : la coquille du dashboard, l'intégration de l'API Claude, et les trois premiers onglets de génération IA (Identité de marque, Piliers de contenu, Tonalité & voix).

## BLOC 1 — Coquille du dashboard

Construis la structure générale du dashboard, visible après la création d'un profil de marque :

- Barre latérale gauche fixe avec les 7 onglets dans cet ordre : Identité de marque, Audit, Piliers de contenu, Tonalité & voix, Ligne éditoriale, KPIs & Reporting, Règles opérationnelles. Pour l'instant, seuls les 3 premiers onglets listés dans ce prompt sont fonctionnels — les autres apparaissent dans la sidebar mais affichent un état "à venir" si on clique dessus.
- En-tête du dashboard reprenant dynamiquement le logo et la couleur principale du profil de marque actif (récupérés depuis `brand_profiles`).
- Sélecteur de profil en haut à droite (dropdown en glassmorphism clair, cf. cahier des charges section 4.3bis) permettant de basculer entre les profils de marque de l'utilisateur, et de créer un nouveau profil directement depuis ce sélecteur.
- Navbar en glassmorphism clair déjà spécifiée précédemment — réutilise le même composant que sur les pages d'onboarding, ne le redéveloppe pas.

## BLOC 2 — Intégration API Claude (backend uniquement)

- Crée une route API Next.js server-side (`/app/api/generate/route.ts`) qui appelle l'API Anthropic. **La clé API ne doit jamais être exposée côté client** — utilise une variable d'environnement serveur (`ANTHROPIC_API_KEY`), jamais préfixée `NEXT_PUBLIC_`.
- Modèle à utiliser : `claude-sonnet-5`.
- La route accepte un `type` (identity / pillars / tone) et un `context` (données du profil de marque + réponses au questionnaire), et retourne une réponse structurée en JSON strict — configure le prompt système pour que Claude réponde uniquement en JSON, sans texte d'accompagnement, sans balises markdown.
- Structure de réponse attendue par type :
  - `identity` : `{ positioning: string, target_segments: [{name, description, need}], visual_palette: [{color, usage}], marketing_objectives: string[] }`
  - `pillars` : `{ pillars: [{name, description, examples: string[]}] }` (3 à 5 piliers)
  - `tone` : `{ do_list: string[], dont_list: string[] }`
- Ajoute une gestion d'erreur propre (timeout, réponse malformée) avec message clair côté interface, jamais un écran blanc en cas d'échec.

## BLOC 3 — Onglet Identité de marque

**Questionnaire initial** (affiché uniquement si aucune identité n'existe encore pour ce profil) :
1. Nom de la marque ou de l'entreprise (pré-rempli depuis `brand_profiles`)
2. Secteur d'activité (pré-rempli depuis `brand_profiles`)
3. En une phrase, que vend ou propose cette marque ?
4. Qui sont les clients actuels ou visés ? (jusqu'à 3 segments, champs répétables)
5. Quel problème cette marque résout-elle pour ses clients ?
6. Qu'est-ce qui différencie cette marque de ses concurrents ?
7. Trois mots qui décrivent la personnalité de la marque
8. Quel est l'objectif principal des réseaux sociaux pour cette marque ? (select : notoriété / conversion / fidélisation / recrutement)
9. Sur quels canaux la marque est-elle déjà présente ou souhaite-t-elle être présente ? (multi-select)
10. Y a-t-il des sujets ou formulations à éviter absolument ? (champ libre, optionnel)

Bouton "Générer mon identité de marque" → appelle `/api/generate` avec `type: identity`, stocke le résultat dans `brand_identity`.

**Affichage du résultat** : trois cartes horizontales sur fond `#F5F5F7` — Positionnement / Cibles prioritaires / Palette visuelle obligatoire (cf. cahier des charges section 5.4). Chaque carte éditable en un clic (mode édition inline), sauvegarde automatique dans Supabase à la perte de focus du champ.

## BLOC 4 — Onglet Piliers de contenu

Bouton "Générer mes piliers de contenu" → appelle `/api/generate` avec `type: pillars`, en passant le contenu de `brand_identity` comme contexte. Stocke le résultat dans `content_pillars`.

Affichage : grille de cartes (une par pilier), chaque carte avec titre, description, exemples de formats. Bouton "+" pour ajouter un pilier manuellement. Chaque carte éditable et supprimable.

## BLOC 5 — Onglet Tonalité & voix éditoriale

Bouton "Générer ma tonalité de marque" → appelle `/api/generate` avec `type: tone`, en passant `brand_identity` comme contexte. Stocke le résultat dans `tone_voice`.

Affichage : deux colonnes côte à côte — "On dit / On fait" (fond vert doux `#34C759` à 10% d'opacité) et "On évite / On ne fait pas" (fond rouge doux). Listes à puces éditables (ajout, suppression, modification de ligne).

## BLOC 6 — Ce que tu ne dois PAS faire à cette étape

- Ne construis pas les onglets Audit, Ligne éditoriale, KPIs, Règles opérationnelles — ils restent en état "à venir" dans la sidebar.
- N'implémente pas encore le prompt caching ni le batch processing — fonctionnel d'abord, optimisation ensuite.
- Ne code pas encore de logique de quota de génération par palier tarifaire.
- Ne touche pas à l'onboarding déjà construit, sauf si un bug bloquant t'empêche d'avancer.

Une fois les 3 onglets fonctionnels de bout en bout (génération → affichage → édition → sauvegarde persistante), arrête-toi et attends la prochaine instruction.


---

# Troisième prompt — Ligne éditoriale + Workflow de validation

À utiliser une fois le deuxième prompt (dashboard + Identité de marque + Piliers de contenu + Tonalité & voix) fonctionnel et validé. Copier-coller tel quel dans Claude Code, dans la continuité du même projet.

---

Les onglets Identité de marque, Piliers de contenu et Tonalité & voix sont fonctionnels. On passe à l'onglet Ligne éditoriale — le cœur du produit — avec son mécanisme de génération par canal et son workflow de validation.

## BLOC 1 — Sélection et gestion des canaux

Au clic sur l'onglet "Ligne éditoriale" dans la sidebar :
- Menu déroulant (glassmorphism clair, cf. section 4.3bis du cahier des charges) listant les canaux déjà créés pour ce profil de marque (une entrée dans `editorial_lines` par canal), avec option "+ Ajouter un canal".
- "+ Ajouter un canal" ouvre un petit formulaire : nom du canal (Facebook / Instagram / TikTok / YouTube / Site web / Autre — texte libre si Autre), période de la ligne éditoriale (1 mois ou 3 mois, avec dates de début/fin calculées automatiquement).
- Chaque canal ajouté devient un sous-onglet horizontal sous "Ligne éditoriale".

## BLOC 2 — Génération de la trame éditoriale

Étend la route API `/app/api/generate/route.ts` créée au prompt précédent avec un nouveau `type: "editorial_line"`.

**Logique de génération à respecter précisément** (cf. cahier des charges section 6.3) :
1. Le contexte envoyé à Claude Sonnet 5 inclut : les piliers de contenu (`content_pillars`), la tonalité (`tone_voice`), le canal sélectionné, et la durée choisie (1 ou 3 mois).
2. Les piliers doivent être **répartis en rotation sur les semaines** de la période — jamais un seul pilier étiré sur toute la durée, jamais une semaine déconnectée des piliers existants.
3. Le format suggéré par semaine s'adapte au canal (ex. TikTok → vidéo courte ; Facebook → texte/image, éventuellement live ; YouTube → format long).
4. Réponse JSON attendue :
```
{
  entries: [
    {
      week_number: number,
      theme: string,
      content_type: string,
      format: string,
      frequency: string,
      suggested_time: string
    }
  ]
}
```
5. Stocke chaque entrée générée dans `editorial_entries`, rattachée à la `editorial_line` du canal concerné, avec `status: "a_venir"` et `validation_status: "non_requis"` par défaut.

Bouton "Générer la ligne éditoriale" déclenche cette génération pour le canal actif si aucune entrée n'existe encore.

## BLOC 3 — Affichage de la ligne éditoriale

Vue type tableau/kanban organisée par semaine (une colonne ou un bloc par semaine). Chaque entrée affiche : thème, type de contenu, format, fréquence, heure suggérée.

**Badge de statut** (cliquable pour changer) :
- À venir = gris
- En cours = orange (`#FF9F0A`)
- Terminé = vert (`#34C759`)

**Édition libre** :
- Modification directe du thème, du format ou de la fréquence sur chaque entrée.
- Bouton "Régénérer cette semaine" sur chaque entrée individuelle — appelle à nouveau l'API avec le contexte de cette semaine précise uniquement, remplace l'entrée sans toucher aux autres.
- Réorganisation de l'ordre des semaines par glisser-déposer.

## BLOC 4 — Workflow de validation

Sur chaque entrée de `editorial_entries`, ajoute une interaction "Demander une validation" :
- Change `validation_status` à `"en_attente"`, enregistre l'utilisateur courant comme demandeur (pas encore de `validated_by`).
- Affiche un badge secondaire discret à côté du badge de statut principal : "En attente de validation" avec l'horodatage de la demande.
- Un bouton "Valider" (visible pour tout utilisateur ayant accès au profil de marque, pas de rôle spécifique à gérer pour l'instant) change `validation_status` à `"valide"`, enregistre `validated_by` (nom de l'utilisateur) et `validated_at` (timestamp courant).
- Le badge "En attente" devient un badge "Validé le [date] par [nom]" au survol.

Pas de système de commentaires/refus à cette étape — juste le statut et l'historique horodaté. Cette extension pourra être ajoutée plus tard si besoin.

## BLOC 5 — Ce que tu ne dois PAS faire à cette étape

- Ne construis pas encore les onglets Audit, KPIs & Reporting, Règles opérationnelles, Guide Lives — ils restent en état "à venir".
- N'implémente pas de notifications (email, push) liées au workflow de validation — le badge visuel suffit pour l'instant.
- Ne code pas de gestion de rôles/permissions différenciée (ex. seul un "responsable" peut valider) — tout utilisateur ayant accès au profil peut valider pour l'instant.
- Ne touche pas aux onglets déjà construits (Identité de marque, Piliers de contenu, Tonalité & voix), sauf bug bloquant.

Une fois l'onglet Ligne éditoriale fonctionnel de bout en bout (ajout de canal → génération → affichage → édition → régénération par semaine → workflow de validation), arrête-toi et attends la prochaine instruction.


---

# Quatrième prompt — Onglet Audit

À utiliser une fois le troisième prompt (Ligne éditoriale + workflow de validation) fonctionnel et validé. Copier-coller tel quel dans Claude Code, dans la continuité du même projet.

---

Les onglets Identité de marque, Piliers de contenu, Tonalité & voix et Ligne éditoriale sont fonctionnels. On passe à l'onglet Audit — analyse de fichiers/captures fournis par le CM, avec rendu structuré (jamais de HTML brut).

## BLOC 1 — Upload de fichiers

- Zone de dépôt (drag & drop + bouton de sélection classique) en haut de l'onglet Audit.
- Formats acceptés : images (png, jpg, jpeg) et PDF. Taille maximale par fichier : 10 Mo. Jusqu'à 5 fichiers par audit.
- Upload vers Supabase Storage (bucket `audits`, chemin `{brand_profile_id}/{audit_id}/{filename}`).
- Affiche une prévisualisation miniature de chaque fichier déposé avant lancement de l'audit, avec possibilité de retirer un fichier avant validation.
- Bouton "Lancer l'audit" désactivé tant qu'aucun fichier n'est déposé.

## BLOC 2 — Génération de l'audit (route API)

Étend `/app/api/generate/route.ts` avec un nouveau `type: "audit"`.

- Les fichiers uploadés sont envoyés à Claude Sonnet 5 en `base64` (images en `type: "image"`, PDF en `type: "document"`), accompagnés du contexte de marque déjà en base (`brand_identity`, `content_pillars`, `tone_voice`) pour que l'analyse soit cohérente avec le positionnement défini, pas générique.
- Configure le prompt système pour que Claude retourne uniquement un JSON strict, structure suivante :
```
{
  score: number,          // note globale sur 100
  summary: string,        // 2-3 phrases de synthèse
  strengths: [
    { title: string, description: string }
  ],
  improvements: [
    { title: string, description: string, priority: "faible" | "modere" | "eleve" }
  ]
}
```
- **Contrainte de sécurité stricte** : la réponse est du JSON pur, jamais du HTML. Le rendu se fait exclusivement via des composants React structurés (voir Bloc 3) — n'utilise jamais `dangerouslySetInnerHTML` pour afficher le contenu généré, sous aucun prétexte.
- Stocke le résultat dans `audits` : `source_files` (chemins Storage des fichiers), `report_data` (le JSON ci-dessus), `created_at`.
- Gestion d'erreur : si l'analyse échoue (fichier illisible, timeout), affiche un message clair avec possibilité de relancer, jamais un écran vide.

## BLOC 3 — Affichage du rapport d'audit

Composants React structurés, sur le modèle des cartes déjà utilisées dans les autres onglets :

- **Carte de score** en haut : grand chiffre sur 100, avec le résumé en dessous.
- **Section Points forts** : grille de petites cartes, une par point fort (titre + description).
- **Section Points d'amélioration** : grille de cartes, une par point, avec un badge de priorité coloré (faible = gris, modéré = `#FF9F0A`, élevé = rouge doux) affiché sur chaque carte.

Aucun élément de cette section n'est éditable par le CM — c'est un résultat d'analyse, pas un contenu qu'on modifie comme les piliers ou l'identité de marque.

## BLOC 4 — Historique des audits

- Liste chronologique des audits précédents pour le profil de marque actif, en bas de l'onglet Audit (date, score, aperçu du résumé).
- Clic sur un audit passé → affiche son rapport complet dans la même mise en page que le Bloc 3, en lecture seule.
- Permet de visualiser la progression du score dans le temps (simple liste suffit pour cette version, pas de graphique pour l'instant).

## BLOC 5 — Ce que tu ne dois PAS faire à cette étape

- Ne construis pas encore les onglets KPIs & Reporting, Règles opérationnelles, Guide Lives — ils restent en état "à venir".
- N'implémente pas de graphique de progression du score — la liste chronologique simple suffit pour cette version.
- Ne code pas de quota de nombre d'audits par palier tarifaire.
- N'utilise jamais `dangerouslySetInnerHTML` ou toute injection de HTML brut généré par l'IA — c'est une contrainte de sécurité non négociable pour cet onglet.
- Ne touche pas aux onglets déjà construits, sauf bug bloquant.

Une fois l'onglet Audit fonctionnel de bout en bout (upload → analyse → rendu structuré → historique consultable), arrête-toi et attends la prochaine instruction.


---

# Cinquième prompt — Onglet KPIs & Reporting

À utiliser une fois le quatrième prompt (Audit) fonctionnel et validé. Copier-coller tel quel dans Claude Code, dans la continuité du même projet.

---

Les onglets Identité de marque, Piliers de contenu, Tonalité & voix, Ligne éditoriale et Audit sont fonctionnels. On passe à l'onglet KPIs & Reporting — le seul onglet de cette liste qui ne repose pas sur une génération IA, mais sur une saisie manuelle structurée et un export.

## BLOC 1 — Ajout du champ d'échéance sur le profil de marque

Ajoute une colonne `kpi_deadline_day` (integer, défaut `5`) à la table `brand_profiles` — le jour du mois auquel le rapport KPI doit être soumis (par défaut le 5 du mois suivant la période couverte). Rends ce champ modifiable dans un petit réglage accessible depuis l'onglet KPIs & Reporting (pas besoin d'un écran de paramètres séparé pour l'instant).

## BLOC 2 — Formulaire mensuel

Formulaire simple en haut de l'onglet, un mois à la fois (sélecteur de mois en haut, en glassmorphism clair cf. section 4.3bis du cahier des charges, par défaut le mois en cours) :

- Portée totale (nombre)
- Engagement total — likes + commentaires + partages (nombre)
- Nouveaux abonnés sur la période (nombre)
- Publications réalisées / publications planifiées (deux nombres, affichés en ratio)
- Meilleur contenu du mois (texte libre, courte description)
- Observations / points à signaler (texte libre, optionnel)

Sauvegarde dans `kpi_reports` (`data` en JSONB reprenant ces champs), avec `month`, `deadline` calculé automatiquement à partir de `kpi_deadline_day`, et `submitted_at` renseigné au moment de la sauvegarde.

## BLOC 3 — Indicateur d'échéance

Au-dessus du formulaire, un indicateur visuel de compte à rebours :
- Si la date du jour est avant l'échéance du mois en cours et qu'aucun rapport n'est encore soumis : bandeau discret "Rapport à soumettre avant le [date]" en `#FF9F0A`.
- Si l'échéance est dépassée sans soumission : bandeau en rouge doux "Rapport en retard depuis le [date]".
- Si le rapport du mois est déjà soumis : pas de bandeau, juste une confirmation discrète "Rapport de [mois] envoyé le [date]".

Pas de notification email ou push à cette étape — l'indicateur visuel dans l'interface suffit pour cette version.

## BLOC 4 — Export PDF

Utilise `jsPDF` et `jspdf-autotable` (installe ces deux packages) pour générer un export PDF côté client, déclenché par un bouton "Exporter en PDF" sur un rapport donné (en cours ou passé).

**Structure du PDF** (cohérente avec la charte claire de Markodience, pas de thème sombre) :

- Page A4 portrait, marges 20mm, police Helvetica.
- En-tête : nom et logo du profil de marque (texte si pas de logo image géré côté PDF) en haut à gauche ; à droite, "RAPPORT KPI — [Mois Année]" et la date d'export.
- Ligne de séparation horizontale sous l'en-tête, couleur `#0071E3`.
- Tableau des indicateurs (via `autotable`) : colonnes "Indicateur" / "Valeur", lignes alternées `#FFFFFF` / `#F5F5F7`, reprenant les champs du Bloc 2.
- Section "Meilleur contenu du mois" et "Observations" en texte, sous le tableau.
- Pied de page : nom de la marque à gauche, "Markodience" au centre, numéro de page à droite.
- Nom du fichier : `KPI_[NomMarque]_[MoisAnnee].pdf`.

## BLOC 5 — Historique des rapports

Liste chronologique des rapports déjà soumis pour le profil de marque actif, en bas de l'onglet (mois, date de soumission, statut à temps/en retard). Clic sur un rapport passé → réaffiche le formulaire en lecture seule avec les valeurs de l'époque, plus le bouton d'export PDF disponible pour tout rapport archivé.

## BLOC 6 — Ce que tu ne dois PAS faire à cette étape

- Ne construis pas encore les onglets Règles opérationnelles et Guide Lives — ils restent en état "à venir".
- N'implémente pas de notification email ou push liée à l'échéance — l'indicateur visuel in-app suffit pour cette version.
- Ne code pas de graphique d'évolution des indicateurs dans le temps — la liste chronologique simple suffit.
- Ne touche pas aux onglets déjà construits, sauf bug bloquant.

Une fois l'onglet KPIs & Reporting fonctionnel de bout en bout (saisie → sauvegarde → indicateur d'échéance → export PDF → historique consultable), arrête-toi et attends la prochaine instruction.


---

# Sixième prompt — Onglet Règles opérationnelles

À utiliser une fois le cinquième prompt (KPIs & Reporting) fonctionnel et validé. Copier-coller tel quel dans Claude Code, dans la continuité du même projet.

---

Les onglets Identité de marque, Piliers de contenu, Tonalité & voix, Ligne éditoriale, Audit et KPIs & Reporting sont fonctionnels. On passe à l'onglet Règles opérationnelles — le plus simple techniquement des sept, pas de génération IA, texte libre structuré.

## BLOC 1 — Structure de l'onglet

Accordéon vertical avec six sections fixes, dans cet ordre :
1. Planning & publications
2. Production visuelle
3. Gestion de communautés
4. Reporting
5. Confidentialité & RGPD
6. Sujets à ne jamais aborder

Chaque section est repliée par défaut, sauf la première ouverte à l'arrivée sur l'onglet. Clic sur l'en-tête d'une section → déplie/replie (une seule section ouverte à la fois, ou plusieurs simultanément — comportement standard d'accordéon, au choix le plus simple à implémenter).

## BLOC 2 — Stockage et édition

- Une ligne dans `operational_rules` par section et par profil de marque (`brand_profile_id`, `section`, `content`).
- Chaque section contient un éditeur de texte libre simple (zone de texte avec un minimum de mise en forme : gras, italique, listes à puces — pas besoin d'un éditeur riche complexe, un textarea avec formatage markdown basique affiché en aperçu suffit).
- Sauvegarde automatique à la perte de focus du champ, comme pour les autres onglets déjà construits (cohérence de comportement avec Identité de marque, Piliers de contenu, Tonalité & voix).
- Si une section est vide (aucun contenu encore saisi), affiche un texte d'invite discret à la place ("Aucune règle définie pour cette section — cliquez pour commencer à écrire"), jamais une section visuellement vide sans indication.

## BLOC 3 — Ce que tu ne dois PAS faire à cette étape

- Ne construis pas encore l'onglet Guide Lives — il reste en état "à venir", c'est le dernier de la séquence.
- N'implémente pas de génération IA pour pré-remplir ces sections — contrairement aux autres onglets, celui-ci reste entièrement manuel, sur demande explicite du cahier des charges.
- Ne code pas d'éditeur de texte riche complexe (pas de WYSIWYG avancé) — un textarea avec aperçu markdown basique suffit largement pour cet usage.
- Ne touche pas aux onglets déjà construits, sauf bug bloquant.

Une fois l'onglet Règles opérationnelles fonctionnel de bout en bout (accordéon → édition par section → sauvegarde persistante → état vide géré proprement), arrête-toi et attends la prochaine instruction. Il ne restera alors que l'onglet Guide Lives pour compléter les sept onglets du produit.


---

# Septième prompt — Onglet Guide Lives (dernier onglet de la séquence)

À utiliser une fois le sixième prompt (Règles opérationnelles) fonctionnel et validé. Copier-coller tel quel dans Claude Code, dans la continuité du même projet.

---

Les onglets Identité de marque, Piliers de contenu, Tonalité & voix, Ligne éditoriale, Audit, KPIs & Reporting et Règles opérationnelles sont fonctionnels. On termine la séquence avec l'onglet Guide Lives — le plus complexe des sept, conditionnel et structuré par objectif de live.

## BLOC 1 — Activation du module

- Ajoute une colonne `lives_enabled` (boolean, défaut `false`) à `brand_profiles`.
- Si `lives_enabled` est `false`, l'onglet Guide Lives affiche un écran d'activation simple : texte court expliquant le module, bouton "Activer les lives pour ce profil" qui passe `lives_enabled` à `true` et affiche le contenu du Bloc 2.
- Si `lives_enabled` est `true`, affichage direct du contenu du Bloc 2.

## BLOC 2 — Sélection de l'objectif et gestion des guides

- Crée une table `live_guides` : `id`, `brand_profile_id` (FK), `objective` (text, valeurs possibles : `vente`, `formation`, `information`, `promotion`, `echange`), `structure_data` (jsonb), `created_at`.
- Menu déroulant (glassmorphism clair, cf. section 4.3bis) listant les guides déjà créés pour ce profil, avec option "+ Nouveau guide" qui demande de choisir un objectif parmi les cinq (Vente / Formation / Information-Annonce / Promotion / Échange thématique) avant de créer l'entrée.
- Chaque guide créé devient un sous-onglet horizontal sous "Guide Lives", nommé d'après son objectif.

## BLOC 3 — Génération de la structure de live (route API)

Étend `/app/api/generate/route.ts` avec un nouveau `type: "live_structure"`.

- Contexte envoyé à Claude Sonnet 5 : l'objectif sélectionné, les piliers de contenu, la tonalité, et le secteur de la marque.
- La trame générée doit être spécifique à l'objectif (ne réutilise pas la même structure pour tous) :
  - **Vente** : ouverture, présentation d'offre, gestion des objections, clôture.
  - **Formation** : introduction, démonstration/contenu pédagogique, session de questions, récapitulatif.
  - **Information/Annonce** : contexte, annonce principale, détails pratiques, appel à l'action adapté.
  - **Promotion** : accroche, présentation de l'offre limitée, preuve sociale, appel à l'action.
  - **Échange thématique** : introduction du sujet, animation de la discussion, synthèse, clôture.
- Réponse JSON : `{ steps: [{ time_range: string, title: string, description: string }] }`.
- Stocke dans `structure_data` du guide concerné. Affichage en séquence verticale horodatée (même pattern visuel que les étapes d'un guide, cartes empilées avec le repère de temps à gauche).
- Éditable : chaque étape modifiable, réorganisable, régénérable individuellement (même logique que "Régénérer cette semaine" en Ligne éditoriale).

## BLOC 4 — Organisation de l'équipe (manuel, indépendant de l'objectif)

- Crée une table `live_team_members` : `id`, `brand_profile_id` (FK), `name`, `role` (texte libre : présentateur, modérateur, régie, etc.), `channel` (canal en charge), `rotation_week` (integer, optionnel).
- Section dédiée sous chaque guide (ou partagée entre tous les guides du profil, au choix le plus simple à implémenter — une seule liste d'équipe par profil de marque, pas dupliquée par objectif).
- Cartes par membre, ajout/suppression manuelle, aucune génération IA sur cette section.

## BLOC 5 — Scripts opérationnels

- Crée une table `live_scripts` : `id`, `live_guide_id` (FK), `situation` (texte : "Premier message entrant", "Redirection vers un autre membre", "Relance", "Clôture", etc.), `content` (texte), `is_quick_reply` (boolean, défaut `false`).
- Génération IA (`type: "live_scripts"` dans la même route API) : à partir de l'objectif et du contexte de marque, génère 4 à 6 scripts type couvrant les situations courantes pour cet objectif précis.
- **Banque de réponses rapides** (fonctionnalité validée par les interviews terrain) : sous-section distincte listant les scripts marqués `is_quick_reply: true` — réponses courtes réutilisables pendant un live (prix, disponibilité, stock, informations pratiques), chacune avec un bouton "Copier" en un clic pour coller rapidement dans une messagerie externe. Le CM peut ajouter ses propres réponses rapides manuellement, en plus de celles générées.
- Chaque script reste éditable après génération.

## BLOC 6 — Ce que tu ne dois PAS faire à cette étape

- N'implémente aucune connexion réelle à une plateforme de live (Facebook, TikTok, etc.) — Markodience reste un outil de préparation, jamais de diffusion ou de publication automatique, conformément au principe fondateur du produit.
- Ne code pas de quota de génération par palier tarifaire.
- N'implémente pas de notification liée aux lives programmés.
- Ne touche pas aux six onglets déjà construits, sauf bug bloquant.

Une fois l'onglet Guide Lives fonctionnel de bout en bout (activation → création de guide par objectif → génération de structure → organisation d'équipe → scripts et banque de réponses rapides), la séquence des sept onglets de Markodience est complète. Arrête-toi et fais un résumé de l'état global du projet.


---

# Huitième prompt — Paliers tarifaires (Gratuit / Pro / Agence) + CinetPay

À utiliser une fois les 7 onglets fonctionnels et testés. Copier-coller tel quel dans Claude Code, dans la continuité du même projet.

**Précision importante** : ce prompt facture le palier Agence "par siège" comme un nombre déclaré à la souscription (impacte le prix), mais ne construit pas de système multi-utilisateurs réel (un seul compte se connecte toujours). Les comptes d'équipe multi-utilisateurs feront l'objet d'un prompt séparé si le besoin se confirme.

---

Les sept onglets de Markodience sont fonctionnels. On active maintenant la logique de paliers tarifaires et le paiement CinetPay.

## BLOC 1 — Extension du schéma

Complète la table `subscriptions` :
```sql
alter table subscriptions add column seats int default 1;
alter table subscriptions add column current_period_start date;
alter table subscriptions add column current_period_end date;
alter table subscriptions add column cinetpay_transaction_id text;
```

Crée une fonction ou vue simple qui calcule, pour un `user_id` donné, le plan actif et la date d'expiration — utilisée partout où une vérification de palier est nécessaire.

## BLOC 2 — Configuration centrale des paliers

Crée un fichier unique `/lib/plans.ts` définissant, en un seul endroit, les règles de chaque palier — toute la logique de gating doit lire ce fichier, jamais de valeurs codées en dur ailleurs dans l'app :

```typescript
export const PLANS = {
  gratuit: {
    label: "Gratuit",
    price: 0,
    maxProfiles: 1,
    features: ["identity", "pillars", "tone"],
    exportWatermark: true,
  },
  pro: {
    label: "Pro",
    price: 12000, // XOF / mois
    maxProfiles: 3,
    features: ["identity", "pillars", "tone", "audit", "editorial", "kpi", "rules", "lives"],
    exportWatermark: false,
  },
  agence: {
    label: "Agence",
    pricePerSeat: 18000, // XOF / siège / mois
    minSeats: 2,
    maxProfiles: null, // illimité
    features: ["identity", "pillars", "tone", "audit", "editorial", "kpi", "rules", "lives", "white_label", "multi_export"],
    exportWatermark: false,
  },
};
```

**Note sur `features` : les valeurs `["identity","pillars","tone"]` = Identité de marque, Piliers de contenu, Tonalité & voix. `"audit"`, `"editorial"`, `"kpi"`, `"rules"`, `"lives"` correspondent respectivement à Audit, Ligne éditoriale, KPIs & Reporting, Règles opérationnelles, Guide Lives — ces cinq onglets sont réservés à Pro et Agence, cohérent avec le fait qu'ils ont tous été construits en Phase 2 dans les prompts précédents.**

## BLOC 3 — Blocage des onglets non inclus

- Dans la sidebar, tout onglet non inclus dans le plan actif de l'utilisateur affiche une icône de cadenas discrète à côté de son nom.
- Clic sur un onglet verrouillé → au lieu du contenu normal, affiche un état "upsell" simple en carte flottante glassmorphism clair (cf. section 4.3bis du cahier des charges) : titre de l'onglet, une phrase expliquant sa valeur, bouton "Passer au palier Pro" (ou Agence selon le cas) menant à l'écran de paiement du Bloc 5.
- La limite de profils (`maxProfiles`) est vérifiée au moment de la création d'un nouveau profil de marque — si la limite est atteinte, bloque la création avec un message clair et un lien vers la mise à niveau, plutôt qu'une erreur technique.

## BLOC 4 — Watermark sur les exports (palier Gratuit)

Pour tout export généré (actuellement : export PDF du KPI Reporting), si le plan actif a `exportWatermark: true`, superpose un filigrane discret "Généré avec Markodience — version gratuite" en bas de chaque page du PDF exporté.

## BLOC 5 — Écran de mise à niveau et paiement CinetPay

- Écran simple listant les trois paliers en cartes côte à côte (Gratuit / Pro / Agence), avec pour Agence un sélecteur de nombre de sièges (minimum 2) qui recalcule le prix affiché en direct (`seats × pricePerSeat`).
- Bouton "Choisir ce palier" sur Pro et Agence → initie une transaction CinetPay (utilise le SDK ou l'API CinetPay, clé API en variable d'environnement serveur, jamais exposée côté client).
- Crée une route API `/app/api/cinetpay/webhook/route.ts` qui reçoit la confirmation de paiement de CinetPay, met à jour `subscriptions` (plan, seats, status, current_period_start/end, cinetpay_transaction_id).
- Après paiement confirmé, redirige l'utilisateur vers son dashboard avec un message de confirmation, et les onglets précédemment verrouillés se débloquent immédiatement (relecture du plan actif).

## BLOC 6 — Ce que tu ne dois PAS faire à cette étape

- Ne construis aucun système d'invitation ou de compte multi-utilisateurs — le palier Agence reste un seul compte connecté, "sièges" n'est qu'une variable de facturation pour l'instant.
- N'implémente pas de renouvellement automatique récurrent complexe — un simple enregistrement de `current_period_end` suffit, la logique de relance de paiement pourra être ajoutée plus tard.
- Ne code pas de période d'essai gratuite du palier Pro — tel que spécifié, le palier Gratuit existe déjà comme point d'entrée sans essai limité dans le temps.
- Ne touche à aucun des sept onglets déjà construits, sauf pour y ajouter la vérification de palier prévue dans ce prompt.

Une fois la logique de paliers fonctionnelle de bout en bout (blocage des onglets non inclus → paiement CinetPay → déblocage après confirmation → watermark sur le palier Gratuit), le produit est prêt pour un premier test utilisateur réel payant. Arrête-toi et fais un résumé de l'état global du projet.


---
