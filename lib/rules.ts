export const RULE_SECTIONS = [
  { key: "planning", label: "Planning & publications" },
  { key: "visual", label: "Production visuelle" },
  { key: "community", label: "Gestion de communautés" },
  { key: "reporting", label: "Reporting" },
  { key: "privacy", label: "Confidentialité & RGPD" },
  { key: "taboo", label: "Sujets à ne jamais aborder" },
] as const;
export type RuleKey = (typeof RULE_SECTIONS)[number]["key"];

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
