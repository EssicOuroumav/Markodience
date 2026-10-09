import { z } from "zod";

/**
 * Concision imposée par le code : les consignes demandent des textes courts, mais un modèle écrit toujours trop long.
 * Un texte qui dépasse sa limite n'est pas rejeté (un rejet coûte une génération entière) : il est réécrit en une seule passe, plus courte.
 * Références mesurées sur le document AICHA : règle 21 mots, pilier 13, thème 7, idée de post 10, accroche 7.
 */
export const wordCount = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;

/** Limites en mots, par chemin (« [] » = chaque élément d'une liste). */
export type Limits = Record<string, number>;

export const LIMITS: Record<string, Limits> = {
  identity: { mission: 45, tagline: 10, "values[].name": 3, "values[].text": 16, "tone_table[].register": 5, "tone_table[].do": 12, "tone_table[].dont": 12, "rewrite.avoid": 28, "rewrite.follow": 36, logo_note: 40 },
  pillars: { "pillars[].title": 5, "pillars[].purpose": 16, "pillars[].formats": 10 },
  themes: { "themes[].theme": 9 },
  network: { headline: 14, lead: 28, frequency: 14, format: 16, best_hours: 12, rules_title: 8, "rules[].label": 3, "rules[].text": 24, method: 45 },
  templates: { "avant[].idea": 14, "avant[].hook": 9, "pendant[].idea": 14, "pendant[].hook": 9, "apres[].idea": 14, "apres[].hook": 9, "evergreen[].idea": 14, "evergreen[].hook": 9 },
  organic: { "levers[].title": 6, "levers[].why": 16, "levers[].action": 10 },
  kpi: { intro: 40, "rows[].indicator": 10, "rows[].by_network[].target": 14, "rows[].cadence": 8, "cadences[].text": 35 },
  rules: { "rules[].title": 7, "rules[].text": 24 },
};

export type Over = { path: string; text: string; max: number };

function walk(node: unknown, parts: string[], path: string, max: number, out: Over[]) {
  if (parts.length === 0) {
    if (typeof node === "string" && wordCount(node) > max) out.push({ path, text: node, max });
    return;
  }
  const [head, ...rest] = parts;
  if (head.endsWith("[]")) {
    const key = head.slice(0, -2);
    const arr = (node as Record<string, unknown>)?.[key];
    if (Array.isArray(arr)) arr.forEach((el, i) => walk(el, rest, `${path ? path + "." : ""}${key}[${i}]`, max, out));
  } else {
    walk((node as Record<string, unknown>)?.[head], rest, `${path ? path + "." : ""}${head}`, max, out);
  }
}

/** Tous les textes d'une étape qui dépassent leur limite. */
export function collectOver(stage: string, value: unknown): Over[] {
  const out: Over[] = [];
  for (const [pattern, max] of Object.entries(LIMITS[stage] ?? {})) walk(value, pattern.split("."), "", max, out);
  return out;
}

function setPath(root: unknown, path: string, text: string) {
  const parts = path.split(".").flatMap((p) => {
    const m = /^(\w+)\[(\d+)\]$/.exec(p);
    return m ? [m[1], Number(m[2])] : [p];
  });
  let cur = root as Record<string | number, unknown>;
  for (const p of parts.slice(0, -1)) cur = cur[p] as Record<string | number, unknown>;
  cur[parts[parts.length - 1]] = text;
}

/** Applique les réécritures (même ordre que `over`) sans modifier l'objet d'origine. */
export function applyRewrites<T>(value: T, over: Over[], rewrites: string[]): T {
  const copy = structuredClone(value);
  over.forEach((o, i) => {
    const text = rewrites[i]?.trim();
    // Une réécriture vide ou plus longue que l'original est ignorée : on garde le texte d'origine.
    if (text && wordCount(text) <= wordCount(o.text)) setPath(copy, o.path, text);
  });
  return copy;
}

export const condenseSchema = z.object({ texts: z.array(z.string()) });

export function condensePrompt(over: Over[]): string {
  return `Réécris chacun de ces textes en respectant STRICTEMENT la limite de mots indiquée. Garde tous les faits, chiffres, noms, dates et marqueurs « [X] » ; supprime les adjectifs, les répétitions et les précautions. Phrases courtes, verbes d'action. Garde le même sens et la même langue.
<textes>
${over.map((o, i) => JSON.stringify({ n: i, limite_mots: o.max, texte: o.text })).join("\n")}
</textes>
Structure JSON exacte : { "texts": [string] } avec exactement ${over.length} textes, dans le même ordre. Réponds uniquement par le JSON.`;
}
