import { collectOver, wordCount } from "./brevity";
import { weekdaysIn } from "./networks";
import type * as S from "./schemas";

export type Check = { id: string; ok: boolean; detail: string; stage?: S.StageId; network?: string };

export type PlanForChecks = {
  identity: S.IdentityStage;
  pillars: S.PillarsStage;
  themes: { week: number; theme: string; pillar: string }[];
  networks: { profile: S.NetworkStage; templates: S.TemplatesStage }[];
  organic: S.OrganicStage;
  kpi: S.KpiStage;
  rules: S.RulesStage;
};

const BANNED = ["il est important de", "dans le monde d'aujourd'hui", "n'hésitez pas", "renforcer la visibilité", "thème de la semaine", "de nos jours", "plus que jamais"];

/** Tous les textes du plan, à plat (pour les contrôles de style et de cohérence). */
export function allText(p: PlanForChecks): string[] {
  const out: string[] = [];
  const visit = (v: unknown) => {
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach(visit);
    else if (v && typeof v === "object") Object.values(v).forEach(visit);
  };
  visit(p);
  return out;
}

const tokens = (s: string) => new Set(s.toLowerCase().replace(/\{theme\}/g, " ").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 3));
const jaccard = (a: Set<string>, b: Set<string>) => {
  const inter = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return union === 0 ? 0 : inter / union;
};

/** Phrases qui parlent d'un bilan ou d'un compte rendu et citent un délai en jours. */
export function reportDelays(texts: string[]): number[] {
  const found: number[] = [];
  for (const t of texts) {
    for (const sentence of t.split(/(?<=[.;:!?])\s+|\n/)) {
      if (!/bilan|compte rendu|compte-rendu/i.test(sentence)) continue;
      for (const m of sentence.matchAll(/(?:sous|dans les|en|dans un délai de|après)\s+(\d{1,2})\s*(?:jours?|j)\b/gi)) found.push(Number(m[1]));
    }
  }
  return found;
}

/** Délais de validation (en heures) cités dans les phrases qui parlent de validation ou de relecture. */
export function validationDelays(texts: string[]): number[] {
  const found: number[] = [];
  for (const t of texts) {
    for (const sentence of t.split(/(?<=[.;:!?])\s+|\n/)) {
      if (!/valid|relu|relecture|visa/i.test(sentence)) continue;
      for (const m of sentence.matchAll(/(?:sous|en|dans les|dans un délai de)\s+(\d{1,3})\s*(?:h\b|heures?)/gi)) found.push(Number(m[1]));
    }
  }
  return found;
}

export function runChecks(p: PlanForChecks): Check[] {
  const checks: Check[] = [];

  const total = p.pillars.pillars.reduce((n, x) => n + x.pct, 0);
  checks.push({ id: "piliers-100", ok: total === 100, detail: `Les piliers totalisent ${total} %.`, stage: "pillars" });

  const missing = p.themes.filter((t) => /\[thème à définir\]/i.test(t.theme)).length;
  checks.push({ id: "semaines-completes", ok: missing === 0, detail: missing ? `${missing} semaine(s) sans thème.` : "Toutes les semaines ont un thème.", stage: "themes" });

  // Répartition réelle des thèmes par pilier, comparée aux pourcentages annoncés.
  const count = new Map<string, number>();
  for (const t of p.themes) count.set(t.pillar, (count.get(t.pillar) ?? 0) + 1);
  const gaps = p.pillars.pillars
    .map((x) => ({ title: x.title, target: x.pct, real: Math.round(((count.get(x.title) ?? 0) / Math.max(p.themes.length, 1)) * 100) }))
    .filter((g) => Math.abs(g.real - g.target) > 10);
  checks.push({
    id: "equilibre-piliers",
    ok: gaps.length === 0,
    detail: gaps.length ? gaps.map((g) => `« ${g.title} » : ${g.real} % des semaines au lieu de ${g.target} %`).join(" ; ") + "." : "Les thèmes respectent les pourcentages des piliers (à 10 points près).",
    stage: "themes",
  });

  // Chaque réseau publie sur ses propres jours.
  const daysOf = (n: { templates: S.TemplatesStage }) => new Set([...n.templates.avant, ...n.templates.pendant, ...n.templates.apres, ...n.templates.evergreen].flatMap((r) => weekdaysIn(r.day)));
  for (let i = 0; i < p.networks.length; i++) {
    for (let j = i + 1; j < p.networks.length; j++) {
      const a = daysOf(p.networks[i]), b = daysOf(p.networks[j]);
      const sim = jaccard(a, b);
      checks.push({
        id: `cadence-${p.networks[i].profile.network}-${p.networks[j].profile.network}`,
        ok: sim < 0.6,
        detail: sim < 0.6 ? `${p.networks[i].profile.network} et ${p.networks[j].profile.network} publient des jours différents.` : `${p.networks[j].profile.network} publie les mêmes jours que ${p.networks[i].profile.network} (${[...b].join(", ")}).`,
        stage: "templates",
        network: p.networks[j].profile.network,
      });
    }
  }

  // Les mêmes idées ne doivent pas se retrouver d'un réseau à l'autre.
  let similar = 0;
  for (let i = 0; i < p.networks.length; i++) {
    for (let j = i + 1; j < p.networks.length; j++) {
      for (const phase of ["avant", "pendant", "apres", "evergreen"] as const) {
        for (const ra of p.networks[i].templates[phase]) for (const rb of p.networks[j].templates[phase]) if (jaccard(tokens(ra.idea), tokens(rb.idea)) > 0.6) similar++;
      }
    }
  }
  checks.push({ id: "idees-differentes", ok: similar <= 1, detail: similar ? `${similar} paire(s) d'idées quasi identiques entre deux réseaux.` : "Les idées diffèrent d'un réseau à l'autre.", stage: "templates" });

  // Un seul délai de bilan dans tout le plan.
  const texts = allText(p);
  const delays = [...new Set(reportDelays(texts))];
  const wanted = p.identity.commitments.report_days;
  const bad = delays.filter((d) => d !== wanted);
  checks.push({ id: "delai-bilan", ok: bad.length === 0, detail: bad.length ? `Le bilan est annoncé sous ${[...new Set([wanted, ...bad])].join(", ")} jours : l'engagement est ${wanted} jours.` : `Le délai de bilan est partout de ${wanted} jours.`, stage: "rules" });

  const c = p.identity.commitments;
  const okHours = new Set([c.validation_hours, c.health_review_hours, c.reply_hours]);
  const badHours = [...new Set(validationDelays(texts))].filter((h) => !okHours.has(h));
  checks.push({ id: "delai-validation", ok: badHours.length === 0, detail: badHours.length ? `Délais de validation cités : ${badHours.join(", ")} h, hors des engagements (${c.validation_hours} h, santé ${c.health_review_hours} h).` : "Les délais de validation sont ceux des engagements.", stage: "rules" });

  const lower = texts.join(" \n ").toLowerCase();
  const banned = BANNED.filter((b) => lower.includes(b));
  checks.push({ id: "formules-vides", ok: banned.length === 0, detail: banned.length ? `Formules à bannir : ${banned.join(", ")}.` : "Aucune formule vide." });

  const stages: [string, unknown][] = [["identity", p.identity], ["pillars", p.pillars], ["themes", { themes: p.themes }], ["organic", p.organic], ["kpi", p.kpi], ["rules", p.rules]];
  const over = stages.reduce((n, [k, v]) => n + collectOver(k, v).length, 0) + p.networks.reduce((n, x) => n + collectOver("network", x.profile).length + collectOver("templates", x.templates).length, 0);
  checks.push({ id: "concision", ok: over <= 2, detail: over ? `${over} texte(s) dépassent leur longueur maximale.` : "Tous les textes respectent leur longueur maximale." });

  return checks;
}

/** Statistiques de longueur (mots) pour comparer à la référence. */
export function lengthStats(p: PlanForChecks) {
  const avg = (xs: string[]) => (xs.length ? Math.round((xs.reduce((n, s) => n + wordCount(s), 0) / xs.length) * 10) / 10 : 0);
  const rows = p.networks.flatMap((n) => [...n.templates.avant, ...n.templates.pendant, ...n.templates.apres, ...n.templates.evergreen]);
  return {
    "règle (réf. 21)": avg(p.rules.rules.map((r) => r.text)),
    "pilier (réf. 13)": avg(p.pillars.pillars.map((x) => x.purpose)),
    "thème (réf. 7)": avg(p.themes.map((t) => t.theme)),
    "idée de post (réf. 10)": avg(rows.map((r) => r.idea)),
    "accroche (réf. 7)": avg(rows.map((r) => r.hook)),
    "levier : action (réf. 8)": avg(p.organic.levers.map((l) => l.action)),
    "valeur (réf. 11)": avg(p.identity.values.map((v) => v.text)),
  };
}

/** Marqueurs « [X] » restant à renseigner par la marque. */
export const placeholderCount = (p: PlanForChecks) => allText(p).reduce((n, t) => n + (t.match(/\[[^\]]*\]/g)?.length ?? 0), 0);
