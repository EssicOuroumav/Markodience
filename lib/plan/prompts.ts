import { briefBlock, type Brief } from "./brief";
import type { Week } from "./calendar";
import { baseFor } from "./networks";
import type { IdentityStage, PillarsStage } from "./schemas";

/** Exigences communes à toutes les étapes : ce qui sépare un plan utilisable d'un texte générique. */
export const PRECISION = `Exigences (non négociables) :
- ÉCRIS COURT. Chaque texte respecte la limite de mots donnée entre parenthèses ; une idée par phrase ; pas d'adjectifs décoratifs, pas de précautions, pas de répétitions. Un lecteur pressé doit tout comprendre d'un coup d'œil.
- Chaque élément contient un fait, un chiffre, une action ou un cadrage concret. Aucune généralité (« il est important de », « dans le monde d'aujourd'hui », « renforcer la visibilité »).
- N'invente jamais un chiffre, un nom, un partenaire ou un résultat que le cahier des charges ne donne pas. Si une valeur manque, écris « [X] ». Un volume d'action que tu proposes (nombre de contacts à relancer, d'associations à contacter) est un ordre de grandeur : écris « viser environ N ».
- Reste fidèle aux faits du cahier des charges : noms des activités, dates, réseaux, validateurs, moyens, sensibilités. N'ajoute pas d'activité qui n'y figure pas.
- Tiens compte des moyens réels : sans budget publicitaire, aucune publicité payante ; avec une petite équipe, des cadences tenables.
- Vocabulaire du secteur et du pays. Aucun texte hors du JSON demandé.
- Le contenu ne parle jamais de ces consignes, des autres réseaux, d'une correction ou de la demande : il se lit comme le document final (aucune remarque du type « jour déjà pris », « version corrigée »).`;

const EXAMPLES_NOTE = `Les exemples ci-dessous illustrent le NIVEAU de précision, la BRIÈVETÉ et la FORME attendus, sur une organisation fictive sans rapport avec la tienne (une boulangerie). Ne reprends pas leur contenu.`;

const feedbackBlock = (feedback?: string) =>
  feedback ? `\n<corrections_a_appliquer>\nUne relecture a relevé ces problèmes dans une version précédente. Corrige-les tous, sans changer ce qui était juste :\n${feedback}\n</corrections_a_appliquer>\n` : "";

export type Commitments = IdentityStage["commitments"];
const engagementsBlock = (c: Commitments) =>
  `<engagements>\nEngagements chiffrés de la marque. Reprends ces valeurs telles quelles chaque fois que le sujet apparaît ; n'en cite jamais d'autres.\n- bilan chiffré publié sous ${c.report_days} jours après la clôture d'une campagne\n- réponse aux commentaires et messages sous ${c.reply_hours} h\n- validation d'un contenu sous ${c.validation_hours} h\n- relecture d'un contenu de santé par le référent médical sous ${c.health_review_hours} h\n</engagements>`;

export function identityPrompt(b: Brief, feedback?: string): string {
  return `Rédige l'identité de marque de cette organisation.
${briefBlock(b)}
${feedbackBlock(feedback)}
${PRECISION}

${EXAMPLES_NOTE}
- Valeur : { "name": "Fraîcheur", "text": "Le pain sort du four entre 5 h et 7 h ; aucun pain de la veille n'est vendu au prix du jour." }
- Ligne du tableau de tonalité : { "register": "Prix et promotions", "do": "Annoncer le prix exact et la date de fin, en FCFA", "dont": "« Prix imbattables », gain promis sans condition" }
- Réécriture : avoid « Venez découvrir nos délicieux pains, les meilleurs d'Abidjan ! » / follow « Baguette tradition à 250 FCFA, cuite ce matin à 6 h, à retirer avant 9 h au 12 rue des Jasmins. »

Structure JSON exacte :
{
  "mission": string (2 phrases, 45 mots max : pour qui, quoi, avec quelle exigence),
  "tagline": string (10 mots max),
  "tagline_status": "fourni" | "propose",
  "values": [{ "name": string (3 mots max), "text": string (16 mots max : un comportement concret et vérifiable) }] (4 à 6),
  "tone_table": [{ "register": string (5 mots max), "do": string (16 mots max), "dont": string (16 mots max) }] (5 à 7 registres propres à ce secteur et à ses sensibilités : image des personnes, discours, données, validation…),
  "rewrite": { "avoid": string (28 mots max), "follow": string (36 mots max) } (le MÊME message écrit de façon fautive puis conforme, avec un fait concret dans la version conforme),
  "logo_note": string (40 mots max : zone de protection, versions, interdits),
  "commitments": { "report_days": number, "reply_hours": number, "validation_hours": number, "health_review_hours": number }
}
Slogan : ${b.tagline ? `la marque en a un, « ${b.tagline} » : reprends-le mot pour mot et mets "tagline_status": "fourni".` : `le cahier des charges n'en donne pas : propose-en un (mets "tagline_status": "propose").`}
Engagements : ${Object.keys(b.commitments).length ? `la marque impose déjà ${JSON.stringify(b.commitments)} ; reprends ces valeurs et propose les autres.` : "propose des valeurs réalistes pour les moyens indiqués."} Ce sont les seules valeurs que le plan citera, dans toutes ses parties.
Réponds uniquement par le JSON.`;
}

export function pillarsPrompt(b: Brief, id: IdentityStage, feedback?: string): string {
  return `Définis les piliers de contenu pondérés de cette organisation.
${briefBlock(b)}
<identite>${JSON.stringify({ mission: id.mission, values: id.values.map((v) => v.name) })}</identite>
${feedbackBlock(feedback)}
${PRECISION}
- Les pourcentages sont des entiers dont la somme fait EXACTEMENT 100. Le pilier le plus lourd prouve le travail de l'organisation ; au moins un pilier reste utile les semaines sans activité ; au moins un pilier est dédié à l'appel à l'action ; si l'organisation collecte des fonds (dons, cotisations), un pilier de transparence est obligatoire ; sinon, ce rôle devient facultatif.
- 5 à 6 piliers, nommés en 2 à 4 mots. Chaque pilier a UN rôle : preuve (montrer le travail, le produit ou le service), appel (appel à l'action : don, achat, commande, inscription, contact), transparence (bilans et comptes), voix (témoignages, personnes), pedagogie (informer, prévenir, expliquer), communaute (bénévoles, partenaires, coulisses). Deux piliers peuvent partager un rôle ; au moins quatre rôles différents.

${EXAMPLES_NOTE}
- { "title": "Preuves de fabrication", "pct": 30, "purpose": "Montrer chaque étape pour justifier le prix. Sans lui, les promotions sonnent creux.", "formats": "Vidéos du fournil, avant/après de cuisson, témoignages filmés" }

Structure JSON exacte :
{ "pillars": [{ "title": string (5 mots max), "role": "preuve" | "appel" | "transparence" | "voix" | "pedagogie" | "communaute", "pct": number, "purpose": string (16 mots max : le rôle du pilier et pourquoi il pèse ce poids), "formats": string (10 mots max : formats concrets séparés par des virgules) }] }
Réponds uniquement par le JSON.`;
}

export function themesPrompt(b: Brief, weeks: Week[], pillars: PillarsStage, assigned: string[], feedback?: string): string {
  const rows = weeks.map((w, i) => ({ week: w.index, start: w.start, phase: w.phase, campaign: w.campaign, pilier: assigned[i], dates_cles: w.facts.map((f) => `${f.label}${f.approx ? " (à recaler)" : ""}`) }));
  return `Écris le thème de chacune des ${weeks.length} semaines du calendrier éditorial.
${briefBlock(b)}
<piliers>${JSON.stringify(pillars.pillars.map((p) => ({ title: p.title, pct: p.pct })))}</piliers>
<semaines>
${rows.map((r) => JSON.stringify(r)).join("\n")}
</semaines>
${feedbackBlock(feedback)}
${PRECISION}
Règles du calendrier :
- La phase et la campagne de chaque semaine sont déjà fixées : avant = teasing de la campagne citée, pendant = campagne en cours, apres = bilan chiffré, evergreen = contenu permanent. Respecte-les.
- Les semaines evergreen servent un pilier, pas la campagne.
- Le pilier de chaque semaine (champ « pilier ») est déjà fixé : la répartition annuelle des piliers respecte leurs pourcentages. Écris un thème qui sert CE pilier, dans la phase et la campagne de la semaine. Ne répète jamais le même thème.
- « dates_cles » sont calculées : ne les contredis pas et n'en ajoute pas. Utilise-les seulement quand elles servent l'activité ou un pilier.
- Un thème = au plus 9 mots, concret, jamais « Thème de la semaine ».

Structure JSON exacte :
{ "themes": [{ "week": number, "theme": string }] }
Une entrée par semaine, de 1 à ${weeks.length}. Réponds uniquement par le JSON.`;
}

export function networkPrompt(b: Brief, network: string, id: IdentityStage, pillars: PillarsStage, takenDays: string[], feedback?: string): string {
  const net = b.networks.find((n) => n.name === network);
  const base = baseFor(network);
  return `Définis la ligne éditoriale du réseau « ${network} » pour cette organisation.
${briefBlock(b)}
<identite>${JSON.stringify({ tagline: id.tagline, values: id.values.map((v) => v.name) })}</identite>
<piliers>${JSON.stringify(pillars.pillars.map((p) => p.title))}</piliers>
${engagementsBlock(id.commitments)}
<reperes_reseau>${JSON.stringify({ role: base.role, jours_par_defaut: base.days, formats: base.formats, heures: base.hours, regles_de_plateforme: base.platform, rythme: base.rhythm })}</reperes_reseau>
Public de ce réseau : ${net?.audience || "à déduire du cahier des charges"}.
Jours déjà pris par les autres réseaux de la marque : ${takenDays.length ? takenDays.join(", ") : "aucun"}.
${feedbackBlock(feedback)}
${PRECISION}
- Les « repères du réseau » sont des faits de plateforme : appuie-toi dessus et adapte-les à la marque (sensibilités, public, moyens), sans les recopier tels quels.
- Cadence tenable avec l'équipe indiquée. Les jours de publication sont ceux des repères, SAUF s'ils sont déjà pris par un autre réseau : choisis alors d'autres jours, pour que chaque réseau ait sa propre cadence.
- Les règles sont propres au réseau et appliquées aux sensibilités de l'organisation ; une règle = une consigne qu'on peut vérifier.
- La méthode décrit le rythme fixe de la semaine, un jour par temps, à partir d'UN seul tournage ou d'UNE seule preuve terrain par semaine (on décline, on ne produit pas trois contenus distincts).
- Reprends les engagements chiffrés sans les modifier.

${EXAMPLES_NOTE}
- règle { "label": "Légende", "text": "L'accroche tient dans les deux premières lignes, avant la coupure « … plus »." }

Structure JSON exacte :
{
  "network": "${network}",
  "headline": string (14 mots max : le rôle de ce réseau pour cette marque),
  "lead": string (28 mots max : public visé et ce que le réseau porte),
  "frequency": string (14 mots max, ex. « 3 publications par semaine : lundi, mercredi, vendredi »),
  "format": string (16 mots max : formats et dimensions prioritaires),
  "best_hours": string (12 mots max),
  "rules_title": string (8 mots max),
  "rules": [{ "label": string (3 mots max), "text": string (24 mots max) }] (4 à 6),
  "method": string (45 mots max : le rythme de la semaine en trois temps)
}
Réponds uniquement par le JSON.`;
}

export function templatesPrompt(b: Brief, network: string, net: { frequency: string; method: string }, pillars: PillarsStage, id: IdentityStage, others: string[], feedback?: string): string {
  return `Écris les modèles de publications du réseau « ${network} », par phase du calendrier.
${briefBlock(b)}
<reseau>${JSON.stringify(net)}</reseau>
<piliers>${JSON.stringify(pillars.pillars.map((p) => p.title))}</piliers>
${engagementsBlock(id.commitments)}
Idées déjà utilisées sur les autres réseaux (ne les répète pas, trouve un autre angle propre à ce réseau et à son public) :
${others.length ? others.map((o) => `- ${o}`).join("\n") : "- aucune"}
${feedbackBlock(feedback)}
${PRECISION}
Ces modèles seront répétés chaque semaine d'une phase, avec le thème de la semaine injecté à la place de {theme}. Donc :
- Une ligne par publication de la semaine, avec le jour exact de la cadence du réseau (un seul jour par ligne).
- « idea » (22 mots max) : ce qu'on publie ; contient obligatoirement {theme} et reste vrai pour n'importe quelle semaine de la phase.
- « hook » (12 mots max) : l'accroche qui donne envie de lire ; peut contenir {theme}.
- « pillar » : un titre de pilier ci-dessus. « format » : un format réel du réseau.
- Phases : avant = mobiliser et annoncer (compte à rebours, objectif chiffré) ; pendant = montrer l'action et la preuve ; apres = bilan chiffré, remerciements, suite ; evergreen = pédagogie, coulisses, lien avec la communauté.
- Chaque réseau a son angle : le réseau de la cible la plus décisive (donateurs, clients, partenaires) porte la preuve et les chiffres, celui des plus jeunes l'émotion et le visuel, celui du direct les coulisses brutes.
- Les trois publications d'une semaine déclinent un même fond ; l'appel à l'action (don, achat, inscription) reste sur le réseau qui convertit le mieux.

${EXAMPLES_NOTE}
- phase « pendant » : { "day": "Lundi", "pillar": "Preuves de fabrication", "format": "Album photo", "idea": "Reportage d'ouverture : {theme}. Premières images et premier chiffre du fournil.", "hook": "Ce matin, voici ce qui sort du four." }

Structure JSON exacte :
{ "network": "${network}", "avant": [row], "pendant": [row], "apres": [row], "evergreen": [row] }
avec row = { "day": string, "pillar": string, "format": string, "idea": string, "hook": string }. 2 à 4 lignes par phase. Réponds uniquement par le JSON.`;
}

export function organicPrompt(b: Brief, pillars: PillarsStage, id: IdentityStage, feedback?: string): string {
  return `Propose 10 à 12 leviers de portée organique, activables sans budget publicitaire.
${briefBlock(b)}
<piliers>${JSON.stringify(pillars.pillars.map((p) => p.title))}</piliers>
${engagementsBlock(id.commitments)}
${feedbackBlock(feedback)}
${PRECISION}
- Chaque levier est ancré dans le contexte local réel de l'organisation (relais physiques, groupes, médias de proximité, WhatsApp, micro-créateurs, partenaires, lieux).
- « action » (14 mots max) : une action chiffrée et datée RELATIVEMENT à une campagne (« 3 semaines avant le lancement de X », « cette semaine ») ; jamais une date de calendrier fixe qui tomberait avant le début du plan.
- N'invente aucun partenaire nommé : désigne des catégories (« associations de parents d'élèves »). Équilibre les cibles : ne réserve pas un public à une seule communauté si la marque s'adresse à tous.
- Présente les pistes qui supposent des contacts que la marque n'a peut-être pas comme « à tester ».

${EXAMPLES_NOTE}
- { "title": "Clients relais", "why": "Un code de parrainage transforme le bouche-à-oreille en canal mesurable.", "action": "Remettre 20 cartes de parrainage dès la première semaine" }

Structure JSON exacte :
{ "levers": [{ "title": string (6 mots max), "why": string (16 mots max), "action": string (10 mots max) }] }
Réponds uniquement par le JSON.`;
}

export function kpiPrompt(b: Brief, id: IdentityStage, cadences: string[], feedback?: string): string {
  return `Définis le plan de suivi des indicateurs.
${briefBlock(b)}
${engagementsBlock(id.commitments)}
<cadences_publiees>
Cadence de publication DÉJÀ fixée, à reprendre à l'identique dans les seuils de processus :
${cadences.map((c) => `- ${c}`).join("\n")}
</cadences_publiees>
${feedbackBlock(feedback)}
${PRECISION}
- 6 à 8 indicateurs, une ligne chacun ; pour chaque réseau du cahier des charges, une cible ou une priorité.
- Aucune donnée historique n'existe : pour les RÉSULTATS (dons, portée, engagement), donne un ordre de grandeur indicatif ou « [X] à recalibrer après 90 jours ». Pour les PROCESSUS (publications faites, bilans publiés dans le délai, messages traités dans le délai), donne des seuils fermes mesurables, tirés des engagements.
- Les indicateurs tiennent compte de l'objectif de la marque (dons, ventes, inscriptions, notoriété…) et de ses campagnes.
- « cadences » : trois rythmes de reporting (équipe, direction, bilan de campagne) avec le contenu de chacun, en 35 mots max.

Structure JSON exacte :
{
  "intro": string (40 mots max : fourchettes indicatives, à recalibrer après 90 jours),
  "rows": [{ "indicator": string (10 mots max), "by_network": [{ "network": string, "target": string (14 mots max) }], "cadence": string (8 mots max) }],
  "cadences": [{ "title": string, "text": string }]
}
Réponds uniquement par le JSON.`;
}

export function rulesPrompt(b: Brief, id: IdentityStage, feedback?: string): string {
  return `Rédige les règles opérationnelles non négociables du community manager.
${briefBlock(b)}
${engagementsBlock(id.commitments)}
${feedbackBlock(feedback)}
${PRECISION}
- 7 à 9 règles, chacune avec une étiquette courte (Éthique, Process, Réactivité, Conformité, Identité, Crise, Confidentialité, Neutralité, Données…).
- Les règles découlent des sensibilités déclarées (mineurs, santé, politique, argent, données personnelles) et du workflow de validation. Une règle sur les données et consentements est obligatoire : qui conserve les accords, où, combien de temps.
- Chaque règle contient les délais, seuils ou personnes exacts : ceux des engagements, et les validateurs du cahier des charges. Quand une valeur manque, propose-la et marque « (à confirmer) ».
- Rien de juridique présenté comme une certitude : tu fixes des règles de travail, pas du droit.

Structure JSON exacte :
{ "rules": [{ "title": string (7 mots max), "text": string (24 mots max), "tag": string }] }
Réponds uniquement par le JSON.`;
}

export type CheckSummary = { ok: boolean; detail: string }[];

export function critiquePrompt(b: Brief, plan: unknown, checks: CheckSummary, workload: string): string {
  const decisions = b.decisions.length ? `<decisions_de_la_marque>\nCes choix sont ceux de la marque : ne les conteste pas comme des erreurs ; si l'un d'eux pèse sur la faisabilité, signale-le dans « risks », jamais dans « issues ».\n${b.decisions.map((d) => `- ${d}`).join("\n")}\n</decisions_de_la_marque>\n` : "";
  return `Tu es directeur de la communication. Évalue ce plan stratégique avec exigence, comme si tu devais le signer.
${briefBlock(b)}
<plan>
${JSON.stringify(plan)}
</plan>
${decisions}<controles_automatiques>
Contrôles calculés par le code : ils sont exacts, ne les contredis pas et ne les recompte pas.
${checks.map((c) => `- ${c.ok ? "OK" : "ÉCHEC"} : ${c.detail}`).join("\n")}
- Charge de travail : ${workload}
</controles_automatiques>

Grille :
1. Spécificité : chaque élément est-il concret (fait, chiffre, action) ou générique ?
2. Fidélité : le plan respecte-t-il les activités, dates, réseaux, moyens et sensibilités, sans rien inventer ?
3. Cohérence : thèmes alignés sur les phases, modèles de posts adaptés au réseau, règles cohérentes avec les sensibilités.
4. Faisabilité : cadence tenable avec l'équipe et le budget annoncés.
5. Signalement : chiffres indicatifs et dates mobiles présentés comme tels.

Structure JSON exacte :
{
  "score": number (0-100),
  "verdict": string (3 phrases),
  "strengths": [string] (3 points forts),
  "issues": [{ "severity": "grave"|"mineur", "stage": "identity"|"pillars"|"themes"|"network"|"templates"|"organic"|"kpi"|"rules"|"general", "network": string (seulement pour network et templates), "where": string, "problem": string, "fix": string (correction précise, applicable) }],
  "risks": [{ "level": "faible"|"modere"|"eleve", "risk": string, "mitigation": string }] (3 à 5, ce que le plan ne peut pas garantir),
  "questions": [{ "question": string, "why": string }] (3 à 5 : ce que la marque devrait préciser pour améliorer le plan)
}
Au plus 12 problèmes, les plus graves d'abord. « grave » = erreur de fait, contradiction ou règle enfreinte ; « mineur » = amélioration de style ou de précision. Classe chacun dans l'étape à corriger. Réponds uniquement par le JSON.`;
}

export const condenseModel = "light" as const;
