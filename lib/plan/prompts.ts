import { briefBlock, type Brief } from "./brief";
import type { Week } from "./calendar";
import type { IdentityStage, PillarsStage } from "./schemas";

/** Exigences communes à toutes les étapes : ce qui sépare un plan utilisable d'un texte générique. */
export const PRECISION = `Exigences de précision (non négociables) :
- Chaque élément contient un fait, un chiffre, une action ou un cadrage concret. Aucune généralité (« il est important de », « dans le monde d'aujourd'hui », « renforcer la visibilité »).
- N'invente jamais un chiffre, un nom, un partenaire ou un résultat que le cahier des charges ne donne pas. Si une valeur manque, écris « [X] » ou « à définir avec votre historique ».
- Reste fidèle aux faits du cahier des charges : noms des activités, dates, réseaux, validateurs, moyens, sujets sensibles. N'ajoute pas d'activité qui n'y figure pas.
- Tiens compte des moyens réels : sans budget publicitaire, ne propose aucune publicité payante ; avec une petite équipe, des cadences tenables.
- Phrases courtes, verbes d'action, vocabulaire du secteur et du pays. Aucun texte hors du JSON demandé.`;

const EXAMPLES_NOTE = `Les exemples ci-dessous illustrent le NIVEAU de précision et la FORME attendus, sur une organisation fictive sans rapport avec la tienne (une boulangerie). Ne reprends pas leur contenu.`;

export function identityPrompt(b: Brief): string {
  return `Rédige l'identité de marque de cette organisation.
${briefBlock(b)}

${PRECISION}

${EXAMPLES_NOTE}
- Valeur : { "name": "Fraîcheur", "text": "Le pain sort du four entre 5 h et 7 h ; aucun pain de la veille n'est vendu au prix du jour." }
- Ligne du tableau de tonalité : { "register": "Prix et promotions", "do": "Annoncer le prix exact et la date de fin, en FCFA", "dont": "« Prix imbattables », promesse de gain sans condition" }
- Réécriture : avoid « Venez découvrir nos délicieux pains, les meilleurs d'Abidjan ! » / follow « Baguette tradition à 250 FCFA, cuite ce matin à 6 h, retirez-la avant 9 h au 12 rue des Jasmins. »

Structure JSON exacte :
{
  "mission": string (2-3 phrases : pour qui, quoi, comment, avec quelle exigence),
  "tagline": string (la phrase courte de la marque, reprise du cahier des charges si elle existe),
  "values": [{ "name": string, "text": string }] (4 à 6, chacune traduite en comportement concret et vérifiable),
  "tone_table": [{ "register": string, "do": string, "dont": string }] (4 à 7 registres propres à ce secteur et à ses sensibilités : image des personnes, discours, données, validation…),
  "rewrite": { "avoid": string, "follow": string } (le MÊME message écrit de façon fautive puis conforme, avec un fait concret dans la version conforme),
  "logo_note": string (règle d'usage du logo : zone de protection, versions, interdits)
}
Réponds uniquement par le JSON.`;
}

export function pillarsPrompt(b: Brief, id: IdentityStage): string {
  return `Définis les piliers de contenu pondérés de cette organisation.
${briefBlock(b)}
<identite>${JSON.stringify({ mission: id.mission, values: id.values.map((v) => v.name) })}</identite>

${PRECISION}
- Les pourcentages sont des entiers dont la somme fait EXACTEMENT 100. Le pilier le plus lourd est celui qui prouve le travail de l'organisation ; au moins un pilier est utile même les semaines sans activité ; au moins un pilier est dédié à l'appel à l'action ; si l'organisation collecte des fonds, un pilier de transparence est obligatoire.
- 4 à 6 piliers, nommés en 2 à 4 mots.

${EXAMPLES_NOTE}
- { "title": "Preuves de fabrication", "pct": 30, "purpose": "Montrer chaque étape pour justifier le prix et installer la confiance. Sans lui, les promotions sonnent creux.", "formats": "Vidéos du fournil, avant/après de cuisson, témoignages clients filmés avec accord" }

Structure JSON exacte :
{ "pillars": [{ "title": string, "pct": number, "purpose": string (2 phrases : le rôle du pilier, pourquoi il pèse ce poids), "formats": string (formats concrets, séparés par des virgules) }] }
Réponds uniquement par le JSON.`;
}

export function themesPrompt(b: Brief, weeks: Week[], pillars: PillarsStage): string {
  const rows = weeks.map((w) => ({
    week: w.index,
    start: w.start,
    phase: w.phase,
    campaign: w.campaign,
    dates_cles: w.facts.map((f) => `${f.label}${f.approx ? " (à recaler)" : ""}`),
  }));
  return `Écris le thème de chacune des ${weeks.length} semaines du calendrier éditorial.
${briefBlock(b)}
<piliers>${JSON.stringify(pillars.pillars.map((p) => ({ title: p.title, pct: p.pct })))}</piliers>
<semaines>
${rows.map((r) => JSON.stringify(r)).join("\n")}
</semaines>

${PRECISION}
Règles du calendrier :
- La phase et la campagne de chaque semaine sont déjà fixées (champ « phase » : avant = teasing de la campagne, pendant = campagne en cours, apres = bilan, evergreen = contenu permanent). Respecte-les : un thème « avant » prépare la campagne citée, un thème « apres » en fait le bilan chiffré, un thème « pendant » raconte l'action en cours.
- Les semaines evergreen ne servent pas la campagne : elles servent un pilier. Répartis les piliers selon leurs pourcentages sur l'ensemble de l'année, sans jamais répéter deux semaines de suite le même pilier ni le même thème.
- Appuie-toi sur « dates_cles » quand elles existent (elles sont calculées, ne les contredis pas et n'en ajoute pas).
- Un thème = une phrase d'au plus 14 mots, concrète, jamais « Thème de la semaine ».

Structure JSON exacte :
{ "themes": [{ "week": number, "theme": string, "pillar": string (un des titres de piliers) }] }
Une entrée par semaine, de 1 à ${weeks.length}. Réponds uniquement par le JSON.`;
}

export function networkPrompt(b: Brief, network: string, id: IdentityStage, pillars: PillarsStage): string {
  const net = b.networks.find((n) => n.name === network);
  return `Définis la ligne éditoriale du réseau « ${network} » pour cette organisation.
${briefBlock(b)}
<identite>${JSON.stringify({ tagline: id.tagline, values: id.values.map((v) => v.name) })}</identite>
<piliers>${JSON.stringify(pillars.pillars.map((p) => p.title))}</piliers>
Public de ce réseau : ${net?.audience || "à déduire du cahier des charges"}.

${PRECISION}
- Cadence tenable avec l'équipe indiquée : donne les jours exacts de la semaine.
- Heure idéale en heure locale du pays, avec deux plages.
- Les règles sont propres au réseau (sous-titres, 3 premières secondes, hashtags, légende, formats, durée…) et appliquées aux sensibilités de l'organisation.
- La méthode décrit le rythme fixe de la semaine en trois temps, un jour par temps.

${EXAMPLES_NOTE}
- règle { "label": "Légende", "text": "La question ou l'accroche tient dans les deux premières lignes, avant la coupure « … plus »." }

Structure JSON exacte :
{
  "network": "${network}",
  "headline": string (une idée forte : « ${network} : le rôle de ce réseau pour cette marque »),
  "lead": string (public visé et ce que le réseau porte, 2 phrases),
  "frequency": string (ex. « 3 publications par semaine : lundi, mercredi, vendredi »),
  "format": string (formats et dimensions prioritaires),
  "best_hours": string,
  "rules_title": string (titre du bloc de règles),
  "rules": [{ "label": string, "text": string }] (4 à 6),
  "method": string (le rythme de la semaine en trois temps)
}
Réponds uniquement par le JSON.`;
}

export function templatesPrompt(b: Brief, network: string, net: { frequency: string; method: string }, pillars: PillarsStage): string {
  return `Écris les modèles de publications du réseau « ${network} », par phase du calendrier.
${briefBlock(b)}
<reseau>${JSON.stringify(net)}</reseau>
<piliers>${JSON.stringify(pillars.pillars.map((p) => p.title))}</piliers>

${PRECISION}
Ces modèles seront répétés chaque semaine d'une phase, avec le thème de la semaine injecté à la place de {theme}. Donc :
- Une ligne par publication de la semaine, avec le jour exact (cohérent avec la cadence du réseau).
- « idea » : ce qu'on publie, en une ou deux phrases, qui contient obligatoirement {theme} et reste vrai pour n'importe quelle semaine de la phase.
- « hook » : l'accroche, une phrase courte qui donne envie de lire ; elle peut contenir {theme}.
- « pillar » : un titre de pilier ci-dessus. « format » : un format réel du réseau.
- Les quatre phases ont des intentions différentes : avant = mobiliser et annoncer (compte à rebours, objectif chiffré) ; pendant = montrer l'action et la preuve ; apres = bilan chiffré, remerciements, suite ; evergreen = pédagogie, coulisses, lien avec la communauté.

${EXAMPLES_NOTE}
- phase « pendant » : { "day": "Lundi", "pillar": "Preuves de fabrication", "format": "Album photo", "idea": "Reportage d'ouverture de semaine : {theme}. Premières images et premier chiffre du fournil.", "hook": "Ce matin, voici ce qui sort du four." }

Structure JSON exacte :
{ "network": "${network}", "avant": [row], "pendant": [row], "apres": [row], "evergreen": [row] }
avec row = { "day": string, "pillar": string, "format": string, "idea": string, "hook": string }. Réponds uniquement par le JSON.`;
}

export function organicPrompt(b: Brief, pillars: PillarsStage): string {
  return `Propose 10 à 12 leviers de portée organique, activables sans budget publicitaire.
${briefBlock(b)}
<piliers>${JSON.stringify(pillars.pillars.map((p) => p.title))}</piliers>

${PRECISION}
- Chaque levier est ancré dans le contexte local réel de l'organisation (relais physiques, groupes, médias de proximité, WhatsApp, micro-créateurs, partenaires, lieux).
- « action » : une action chiffrée, datée ou vérifiable, qu'on peut faire cette semaine (ex. « Contacter 3 radios régionales avant octobre »).
- N'invente aucun partenaire nommé : désigne des catégories (« mosquées de quartier », « associations de parents d'élèves »).

${EXAMPLES_NOTE}
- { "title": "Clients relais", "why": "Chaque client satisfait amène en moyenne des proches : un code de parrainage transforme le bouche-à-oreille en canal mesurable.", "action": "Remettre 20 cartes de parrainage dès la première semaine" }

Structure JSON exacte :
{ "levers": [{ "title": string, "why": string, "action": string }] }
Réponds uniquement par le JSON.`;
}

export function kpiPrompt(b: Brief): string {
  return `Définis le plan de suivi des indicateurs.
${briefBlock(b)}

${PRECISION}
- 6 à 8 indicateurs, une ligne chacun ; pour chaque réseau du cahier des charges, une cible ou une priorité.
- Aucune donnée historique n'existe : donne des fourchettes INDICATIVES, annoncées comme telles dans l'introduction, à recalibrer après 90 jours de publication réelle. N'écris jamais un chiffre comme un objectif ferme.
- Les indicateurs tiennent compte de l'objectif de la marque (dons, ventes, inscriptions, notoriété…) et de ses campagnes.
- « cadences » : trois rythmes de reporting (équipe, direction, bilan de campagne) avec le contenu de chacun.

Structure JSON exacte :
{
  "intro": string,
  "rows": [{ "indicator": string, "by_network": [{ "network": string, "target": string }], "cadence": string }],
  "cadences": [{ "title": string, "text": string }]
}
Réponds uniquement par le JSON.`;
}

export function rulesPrompt(b: Brief): string {
  return `Rédige les règles opérationnelles non négociables du community manager.
${briefBlock(b)}

${PRECISION}
- 6 à 8 règles, chacune avec une étiquette courte (Éthique, Process, Réactivité, Conformité, Identité, Crise, Confidentialité, Neutralité…).
- Chaque règle contient les délais, les seuils ou les personnes exactes quand le cahier des charges les donne (validateurs, moyens). Quand il ne les donne pas, propose un délai raisonnable et signale-le par « (à confirmer) ».
- Les règles découlent des sensibilités déclarées (mineurs, santé, politique, argent, données personnelles) et du workflow de validation.
- Rien de juridique présenté comme une certitude : tu fixes des règles de travail, pas du droit.

Structure JSON exacte :
{ "rules": [{ "title": string, "text": string, "tag": string }] }
Réponds uniquement par le JSON.`;
}

export function critiquePrompt(b: Brief, plan: unknown): string {
  return `Tu es directeur de la communication. Évalue ce plan stratégique avec exigence, comme si tu devais le signer.
${briefBlock(b)}
<plan>
${JSON.stringify(plan)}
</plan>

Grille :
1. Spécificité : chaque élément est-il concret (fait, chiffre, action) ou générique ?
2. Fidélité : le plan respecte-t-il les activités, dates, réseaux, moyens et sensibilités du cahier des charges, sans rien inventer ?
3. Cohérence : piliers pondérés (somme 100), thèmes alignés sur les phases, modèles de posts adaptés au réseau, règles cohérentes avec les sensibilités.
4. Faisabilité : cadence tenable avec l'équipe et le budget annoncés.
5. Signalement : chiffres indicatifs et dates mobiles présentés comme tels.

Structure JSON exacte :
{ "score": number (0-100), "verdict": string (3 phrases), "issues": [{ "where": string (partie du plan), "problem": string, "fix": string (correction précise) }] }
Au plus 15 problèmes, les plus graves d'abord. Réponds uniquement par le JSON.`;
}
