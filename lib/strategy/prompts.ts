import { PRECISION } from "../plan/prompts";
import { PRIORITY_LABEL, type PillarsBrief } from "./schemas";

export type StrategyContext = {
  brand: { name: string; sector: string | null; status: string | null; about: string | null; networks: string[] };
  identity: { positioning: string | null; mission: string | null; values: string[]; segments: unknown; objectives: string[]; problem: string | null; differentiation: string | null; avoid: string | null };
  personas: { id: string; name: string; needs: string; frictions: string; tone: string }[];
  pillars: { id: string; name: string | null; subthemes: string[] | null; cta: string | null; formats: string[] | null; persona_ids: string[] | null }[];
};

const block = (c: StrategyContext) => `<marque>
${JSON.stringify({ nom: c.brand.name, secteur: c.brand.sector, statut: c.brand.status === "organisation" ? "organisation" : "freelance", presentation: c.brand.about, reseaux: c.brand.networks }, null, 2)}
</marque>
<identite>
${JSON.stringify(c.identity, null, 2)}
</identite>`;

const EXAMPLES = `Exemples de niveau de précision attendu, sur une organisation fictive (un restaurant qui a beaucoup de vues sur TikTok mais peu de commandes). Ne reprends pas leur contenu.`;

export function personasPrompt(c: StrategyContext): string {
  return `Construis les personas (cibles prioritaires) de cette marque : des hypothèses de travail fondées sur les informations fournies, à valider avec les retours réels.
${block(c)}

${PRECISION}
- 3 à 4 personas, la première est « principal », les autres « secondaire ». Chaque persona est un groupe de personnes réel pour CETTE marque (jamais « les jeunes » en général), nommé par son rôle (« Famille du quartier qui commande le midi »).
- profile (28 mots max) : qui, âge approximatif, situation, contexte. needs (25 mots max) : ce qu'il cherche. frictions (25 mots max) : ce qui l'empêche d'agir ou de faire confiance. tone (22 mots max) : comment lui parler (registre, langue, ce qu'on évite). levers (25 mots max) : ce qui le fait réagir ou agir (preuve, témoignage, offre claire…).
- channels : les réseaux de la marque (liste ci-dessus) où ce public est le plus joignable.
- Aucune statistique inventée. Reste cohérent avec les sujets à éviter.

${EXAMPLES}
- { "name": "Familles du quartier", "profile": "Parents de 30 à 45 ans, déjeunent hors de chez eux ou commandent en semaine.", "needs": "Un repas copieux, un prix connu à l'avance, une commande simple.", "frictions": "Prix introuvables, menu difficile à trouver, délai incertain.", "tone": "Direct et chaleureux, prix toujours affichés, pas de jargon.", "levers": "Formule à prix fixe, photo du plat réel, commande en un message WhatsApp.", "channels": ["Facebook", "WhatsApp"], "priority": "principal" }

Structure JSON exacte :
{ "personas": [{ "name": string, "profile": string, "needs": string, "frictions": string, "tone": string, "levers": string, "channels": [string], "priority": "principal"|"secondaire" }] }
Réponds uniquement par le JSON.`;
}

export function pillarsStrategyPrompt(c: StrategyContext, brief: PillarsBrief): string {
  return `Tu es community manager senior, recruté pour préparer la stratégie de contenu de cette organisation. Construis ses piliers de contenu selon la démarche professionnelle suivante, et n'invente jamais ses besoins.
1. Comprendre l'organisation. 2. Définir les objectifs de communication (distingue un objectif d'une activité : publier davantage n'est pas un résultat). 3. Comprendre les publics. 4. Identifier les grands sujets en croisant les besoins du public, les objectifs et ce que l'organisation peut réellement dire. 5. Formaliser chaque pilier. 6. Tester et ajuster (les piliers restent des hypothèses).
${block(c)}
<publics>
${JSON.stringify(c.personas.map((p) => ({ nom: p.name, besoins: p.needs, freins: p.frictions })), null, 2)}
</publics>
<objectifs_de_la_marque>
${c.identity.objectives.length ? c.identity.objectives.map((o) => `- ${o}`).join("\n") : "- aucun objectif défini : rattache les piliers à l'objectif prioritaire ci-dessous"}
</objectifs_de_la_marque>
<brief_strategique>
Objectif prioritaire : ${PRIORITY_LABEL[brief.priority]}
Problème actuel de communication : ${brief.problem.trim() || "non précisé"}
</brief_strategique>

${PRECISION}
Règles :
- « diagnostic » : « problem » (ce qui coince réellement, 30 mots max), « priority_objective » (reprends mot pour mot l'un des objectifs de la marque ; à défaut l'objectif prioritaire du brief), « hypotheses » (2 à 4 choses à vérifier avant de conclure, 20 mots max chacune).
- 4 à 6 piliers, complémentaires, qui couvrent les besoins stratégiques essentiels. Un pilier est une grande catégorie durable, pas une idée de publication : il se décline en sous-thèmes, puis en sujets, puis en publications.
- Pour chaque pilier : « objective » = un objectif de la marque repris MOT POUR MOT ; « personas » = 1 à 3 noms de publics repris MOT POUR MOT ; « rationale » (28 mots max) = pourquoi ce pilier, relié aux informations fournies ; « subthemes » = 3 à 5 sous-thèmes (8 mots max chacun) ; « formats » = 2 à 4 formats réels ; « cta » (12 mots max) = l'appel à l'action ; « kpi » (14 mots max) = l'indicateur mesurable qui l'évalue ; « role » = preuve | appel | transparence | voix | pedagogie | communaute ; « pct » = part du contenu (entiers, somme exactement 100).
- Chaque pilier doit réussir le test : contribue à un objectif réel, répond à un besoin identifiable du public, permet plusieurs contenus, se mesure.
- Pas de pilier fourre-tout (« Actualités », « Divers »). Respecte les sujets à éviter et les sensibilités de la marque.

${EXAMPLES}
- Pilier : { "name": "Offres et conversion", "role": "appel", "pct": 30, "objective": "Augmenter les commandes venues des réseaux", "personas": ["Familles du quartier"], "rationale": "La visibilité existe mais les prix et la commande sont introuvables : il faut convertir.", "subthemes": ["Menus du midi", "Formules à prix fixe", "Livraison et horaires"], "formats": ["Carrousel avec prix", "Vidéo de 20 secondes"], "cta": "Commandez sur WhatsApp", "kpi": "Clics WhatsApp et commandes attribuées" }

Structure JSON exacte :
{
  "diagnostic": { "problem": string, "priority_objective": string, "hypotheses": [string] },
  "pillars": [{ "name": string, "role": string, "pct": number, "objective": string, "personas": [string], "rationale": string, "subthemes": [string], "formats": [string], "cta": string, "kpi": string }]
}
Réponds uniquement par le JSON.`;
}

export function ideasPrompt(c: StrategyContext, pillar: { name: string | null; subthemes: string[] | null; cta: string | null; formats: string[] | null; objective: string | null }, personaNames: string[], count: number, existing: string[]): string {
  return `Propose ${count} idées de publications pour ce pilier de contenu.
${block(c)}
<pilier>
${JSON.stringify({ nom: pillar.name, objectif: pillar.objective, sous_themes: pillar.subthemes, formats: pillar.formats, appel_a_l_action: pillar.cta, publics: personaNames }, null, 2)}
</pilier>
<idees_deja_en_banque>
${existing.length ? existing.slice(0, 40).map((t) => `- ${t}`).join("\n") : "- aucune"}
</idees_deja_en_banque>

${PRECISION}
- Chaque idée est un SUJET précis qu'on peut produire cette semaine, rattaché à un sous-thème du pilier, pas un thème général. Ne répète aucune idée déjà en banque. Varie les formats et les sous-thèmes.
- title (14 mots max) : l'idée. subtheme : le sous-thème visé. format : un format réel (Reel, Carrousel, Photo, Story, Live, Article, Vidéo courte). networks : 1 à 2 réseaux parmi ceux de la marque. angle (20 mots max) : pourquoi ça marche pour ce public.
- Respecte les règles de la marque (sujets à éviter, consentement, ton).

Structure JSON exacte :
{ "ideas": [{ "title": string, "subtheme": string, "format": string, "networks": [string], "angle": string }] }
Réponds uniquement par le JSON.`;
}
