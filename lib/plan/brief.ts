import { z } from "zod";

/** Le « cahier des charges » d'une marque : tout ce que l'IA doit savoir pour produire un plan précis, sans rien inventer. */
export const KINDS = ["ong", "entreprise", "institution", "createur"] as const;
export const KIND_LABEL: Record<(typeof KINDS)[number], string> = { ong: "ONG, association", entreprise: "Entreprise, commerce", institution: "Institution publique", createur: "Créateur, personnalité" };

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export const activitySchema = z.object({
  name: z.string().min(1).max(300),
  start: isoDate,
  end: isoDate,
  goal: z.string().max(600).default(""),
});

/**
 * ATTENTION : les limites ci-dessous doivent rester **au moins égales** à celles de `extractStage` (lib/plan/extract.ts), sinon une fiche
 * remplie par l'IA est refusée à la construction (« Données invalides ») sans que l'on sache quel champ est en cause.
 * Un test (`lib/plan/brief.test.ts`) vérifie cet alignement. Seul le nombre de réseaux reste plafonné à 5 (une étape par réseau).
 */
export const briefSchema = z.object({
  name: z.string().min(1).max(200),
  kind: z.enum(KINDS),
  country: z.string().max(60).default("Côte d'Ivoire"),
  mission: z.string().min(1).max(1500),
  /** Slogan de la marque, s'il existe (sinon l'IA en propose un, signalé « à valider »). */
  tagline: z.string().max(300).default(""),
  offer: z.string().max(1500).default(""),
  audiences: z.array(z.object({ name: z.string().min(1).max(300), description: z.string().max(600).default("") })).min(1).max(8),
  networks: z.array(z.object({ name: z.string().min(1).max(80), audience: z.string().max(400).default("") })).min(1).max(5),
  /** Campagnes et temps forts : ce qui rythme l'année. Chaque activité a une période. */
  activities: z.array(activitySchema).max(14).default([]),
  resources: z.object({
    ad_budget: z.enum(["aucun", "faible", "moyen", "eleve"]).default("aucun"),
    team: z.string().max(400).default(""),
    validators: z.array(z.string().max(200)).max(8).default([]),
  }),
  /** Engagements chiffrés que la marque impose déjà (sinon l'IA les propose une seule fois et ils sont repris partout à l'identique). */
  commitments: z.object({ report_days: z.number().int().min(1).max(60).optional(), reply_hours: z.number().int().min(1).max(168).optional(), validation_hours: z.number().int().min(1).max(168).optional(), health_review_hours: z.number().int().min(1).max(336).optional() }).default({}),
  /** Choix explicites de la marque (cadence, interdits…) : la relecture ne les conteste pas, elle en signale seulement les risques. */
  decisions: z.array(z.string().max(400)).max(10).default([]),
  sensitivities: z.array(z.string().max(400)).max(12).default([]),
  tone_words: z.array(z.string().min(1).max(80)).max(6).default([]),
  avoid: z.string().max(800).default(""),
  /** Premier lundi du plan et nombre de semaines. */
  plan_start: isoDate,
  weeks: z.number().int().min(4).max(52).default(52),
});
export type Brief = z.infer<typeof briefSchema>;
export type Activity = z.infer<typeof activitySchema>;

/** Rendu texte du cahier des charges, repris tel quel par chaque étape (donnée à analyser, jamais une instruction). */
export function briefBlock(b: Brief): string {
  return `<cahier_des_charges>
${JSON.stringify({ ...b, kind: KIND_LABEL[b.kind] }, null, 2)}
</cahier_des_charges>`;
}

/** Texte décrivant la marque (sert à retenir les journées thématiques pertinentes). */
export const briefContext = (b: Brief) => [b.mission, b.offer, ...b.activities.flatMap((a) => [a.name, a.goal]), ...b.sensitivities, ...b.audiences.map((a) => a.description)].join(" ");

/** Ce qui manque ou ne va pas dans la fiche, en phrases pour l'utilisateur (la forme exacte est contrôlée par `briefSchema`). */
export function briefProblems(f: {
  name: string; mission: string; audiences: { name: string }[]; networks: { name: string }[]; plan_start: string;
  activities: { name: string; start: string; end: string }[];
}): string[] {
  const out: string[] = [];
  const iso = /^\d{4}-\d{2}-\d{2}$/;
  if (!f.name.trim()) out.push("Le nom de la marque.");
  if (!f.mission.trim()) out.push("La mission, en une ou deux phrases.");
  if (!f.audiences.some((a) => a.name.trim())) out.push("Au moins un public à toucher.");
  const nets = f.networks.filter((n) => n.name.trim()).map((n) => n.name.trim().toLowerCase());
  if (nets.length === 0) out.push("Au moins un réseau social.");
  if (new Set(nets).size !== nets.length) out.push("Un réseau est cité deux fois.");
  for (const a of f.activities) {
    const label = a.name.trim() || "Une activité sans nom";
    if (!a.name.trim()) out.push("Le nom de chaque activité.");
    else if (!iso.test(a.start) || !iso.test(a.end)) out.push(`Les dates de « ${label} » (début et fin).`);
    else if (a.end < a.start) out.push(`« ${label} » se termine avant son début.`);
  }
  if (!iso.test(f.plan_start) || new Date(f.plan_start + "T00:00:00Z").getUTCDay() !== 1) out.push("La date de début du plan : un lundi.");
  return out;
}

const FIELD_LABEL: Record<string, string> = {
  name: "Nom", mission: "Mission", tagline: "Slogan", offer: "Ce que vous proposez", avoid: "À éviter absolument", decisions: "Vos décisions",
  sensitivities: "Sujets sensibles", tone_words: "Mots de ton", plan_start: "Début du plan", kind: "Type", country: "Pays", weeks: "Durée du plan",
};
const fmt = (n: number | bigint) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const SUB_LABEL: Record<string, string> = { name: "nom", description: "description", audience: "public visé", goal: "objectif", start: "date de début", end: "date de fin" };

/** Les champs refusés par la validation, en phrases claires (« Ce que vous proposez : 1 612 caractères, maximum 1 500 ») au lieu d'un message général. */
export function briefIssues(brief: unknown): string[] {
  const r = briefSchema.safeParse(brief);
  if (r.success) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const i of r.error.issues) {
    const path = i.path;
    let value: unknown = brief;
    for (const k of path) value = (value as Record<string | number, unknown> | undefined)?.[k as string | number];
    const [head, a, b] = path;
    let label = FIELD_LABEL[String(head)] ?? String(head);
    if (head === "audiences" && typeof a === "number") label = `Public n° ${a + 1}${b ? ` (${SUB_LABEL[String(b)] ?? String(b)})` : ""}`;
    else if (head === "networks" && typeof a === "number") label = `Réseau n° ${a + 1}${b ? ` (${SUB_LABEL[String(b)] ?? String(b)})` : ""}`;
    else if (head === "networks") label = "Réseaux sociaux";
    else if (head === "audiences") label = "Publics à toucher";
    else if (head === "activities" && typeof a === "number") label = `Campagne n° ${a + 1}${b ? ` (${SUB_LABEL[String(b)] ?? String(b)})` : ""}`;
    else if (head === "activities") label = "Campagnes";
    else if (head === "resources") label = b === "team" ? "Équipe" : b === "validators" ? "Qui valide les contenus" : "Budget publicitaire";
    let detail = "valeur invalide";
    const max = (i as { maximum?: number | bigint }).maximum;
    if (i.code === "too_big" && max !== undefined) detail = typeof value === "string" ? `${fmt(value.length)} caractères, maximum ${fmt(max)}` : Array.isArray(value) ? `${value.length} éléments, maximum ${Number(max)}` : `trop long (maximum ${Number(max)})`;
    else if (i.code === "too_small") detail = "à compléter";
    const line = `${label} : ${detail}`;
    if (!seen.has(line)) { seen.add(line); out.push(line); }
  }
  return out;
}
