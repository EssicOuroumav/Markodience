export const RULE_SECTIONS = [
  { key: "planning", label: "Planning & publications" },
  { key: "visual", label: "Production visuelle" },
  { key: "community", label: "Gestion de communautés" },
  { key: "reporting", label: "Reporting" },
  { key: "privacy", label: "Confidentialité & RGPD" },
  { key: "taboo", label: "Sujets à ne jamais aborder" },
] as const;
export type RuleKey = (typeof RULE_SECTIONS)[number]["key"];

/** Courte explication de chaque section, affichée sous le titre. */
export const RULE_HINTS: Record<RuleKey, string> = {
  planning: "Rythme, horaires et circuit de validation des publications.",
  visual: "Charte, formats et exigences de qualité des visuels.",
  community: "Délais et ton des réponses, gestion des commentaires et des réclamations.",
  reporting: "Quand, comment et avec quels indicateurs on rend compte au client.",
  privacy: "Données personnelles, accords écrits, accès aux comptes.",
  taboo: "Sujets, mots et comparaisons à ne jamais utiliser pour cette marque.",
};

/** Modèles de départ, que l'on adapte ensuite à la marque. */
export const RULE_TEMPLATES: Record<RuleKey, string> = {
  planning: "- Publier **3 fois par semaine** (lundi, mercredi, vendredi) à 18h30\n- Valider le calendrier de la semaine suivante chaque vendredi\n- Aucune publication sans validation du responsable",
  visual: "- Respecter le logo et la palette de la marque\n- Formats : 1080×1350 px pour les carrousels, 9:16 pour les vidéos courtes\n- Pas de visuel flou, ni de texte illisible sur mobile",
  community: "- Répondre aux commentaires et messages **sous 2 heures** en journée\n- Ton chaleureux et respectueux, même face à une critique\n- Transmettre toute réclamation sensible au responsable",
  reporting: "- Rapport KPI mensuel remis **avant le 5** du mois suivant\n- Indicateurs : portée, engagement, nouveaux abonnés, publications\n- Un point de suivi de 30 minutes avec le client chaque mois",
  privacy: "- Ne jamais publier une photo ou un témoignage sans **accord écrit**\n- Ne pas partager les accès aux comptes par message\n- Données clients utilisées uniquement pour la gestion de la marque (RGPD)",
  taboo: "- Politique et religion\n- Critiques ou comparaisons avec des concurrents\n- Promesses de résultats garantis",
};

export type Inline = { text: string; bold?: boolean; italic?: boolean };
export type Block = { type: "p"; inline: Inline[] } | { type: "ul"; items: Inline[][] };

/** **gras** et *italique* uniquement ; tout le reste reste du texte brut. */
export function parseInline(src: string): Inline[] {
  const out: Inline[] = [];
  const re = /\*\*(.+?)\*\*|\*(.+?)\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src))) {
    if (m.index > last) out.push({ text: src.slice(last, m.index) });
    if (m[1] !== undefined) out.push({ text: m[1], bold: true });
    else out.push({ text: m[2], italic: true });
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push({ text: src.slice(last) });
  return out;
}

/** Mini-markdown : paragraphes et listes à puces (- ou *). Produit des données, jamais du HTML. */
export function parseMarkdown(src: string): Block[] {
  const blocks: Block[] = [];
  let list: Inline[][] | null = null;
  for (const raw of src.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const bullet = line.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      if (!list) {
        list = [];
        blocks.push({ type: "ul", items: list });
      }
      list.push(parseInline(bullet[1]));
      continue;
    }
    list = null;
    if (line.trim()) blocks.push({ type: "p", inline: parseInline(line) });
  }
  return blocks;
}
