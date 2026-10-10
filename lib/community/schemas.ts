import { z } from "zod";

export const COMMUNITY_KINDS = ["faq", "script", "crise"] as const;
export type CommunityKind = (typeof COMMUNITY_KINDS)[number];
export const COMMUNITY_KIND_LABEL: Record<CommunityKind, string> = { faq: "Questions fréquentes", script: "Scripts de réponse", crise: "Gestion de crise" };
export const COMMUNITY_KIND_HINT: Record<CommunityKind, string> = {
  faq: "Les questions qui reviennent, avec la réponse validée : tout le monde répond pareil.",
  script: "Des situations difficiles (critique, rumeur, demande sensible) et les mots exacts pour y répondre.",
  crise: "Que faire, dans quel ordre et qui décide, selon la gravité.",
};
export const CRISIS_LEVELS = ["faible", "moyen", "grave"] as const;
export type CrisisLevel = (typeof CRISIS_LEVELS)[number];
export const CRISIS_LEVEL_LABEL: Record<CrisisLevel, string> = { faible: "Niveau 1 · Faible", moyen: "Niveau 2 · Moyen", grave: "Niveau 3 · Grave" };

export const INTERACTION_TEMPS = ["chaude", "tiede", "froide"] as const;
export type InteractionTemp = (typeof INTERACTION_TEMPS)[number];
export const TEMP_LABEL: Record<InteractionTemp, string> = { chaude: "Chaude", tiede: "Tiède", froide: "Froide" };
export const TEMP_HINT: Record<InteractionTemp, string> = { chaude: "Prête à agir : à contacter vite", tiede: "Intéressée : à nourrir", froide: "Simple contact : à garder en veille" };
export const INTERACTION_STATUSES = ["a_suivre", "en_cours", "conclue", "abandonnee"] as const;
export type InteractionStatus = (typeof INTERACTION_STATUSES)[number];
export const INTERACTION_STATUS_LABEL: Record<InteractionStatus, string> = { a_suivre: "À suivre", en_cours: "En cours", conclue: "Conclue", abandonnee: "Abandonnée" };

const short = (n: number) => z.string().trim().min(1).max(n);
/** Sortie de l'IA : volontairement large, la longueur utile est demandée dans la consigne. */
export const communityOutput = z.object({
  items: z.array(z.object({
    kind: z.enum(COMMUNITY_KINDS),
    title: short(300),
    situation: z.string().trim().max(1200).default(""),
    body: short(3000),
    level: z.enum(CRISIS_LEVELS).optional(),
  })).min(6).max(24),
});
export type CommunityOutput = z.infer<typeof communityOutput>;

/** Crée au plus ce nombre d'éléments de chaque type : l'IA ne doit pas saturer le plafond de la marque. */
export const MAX_PER_KIND = { faq: 8, script: 5, crise: 3 } as const;

/** Garde, par type, les éléments valides et dédoublonnés ; une crise sans niveau reçoit le niveau « moyen ». */
export function cleanItems(out: CommunityOutput) {
  const seen = new Set<string>();
  const count: Record<CommunityKind, number> = { faq: 0, script: 0, crise: 0 };
  const rows: { kind: CommunityKind; title: string; situation: string; body: string; level: CrisisLevel | null }[] = [];
  for (const i of out.items) {
    const key = `${i.kind}:${i.title.toLowerCase()}`;
    if (seen.has(key) || count[i.kind] >= MAX_PER_KIND[i.kind]) continue;
    seen.add(key);
    count[i.kind]++;
    rows.push({ kind: i.kind, title: i.title, situation: i.situation, body: i.body, level: i.kind === "crise" ? (i.level ?? "moyen") : null });
  }
  return rows;
}

export const mockCommunity = (): CommunityOutput => ({
  items: [
    ...Array.from({ length: 6 }, (_, i) => ({ kind: "faq" as const, title: `Question fréquente numéro ${i + 1}`, situation: "", body: "Réponse claire et validée, en deux phrases, avec le prochain pas à faire." })),
    ...Array.from({ length: 3 }, (_, i) => ({ kind: "script" as const, title: `Situation difficile numéro ${i + 1}`, situation: "Un commentaire critique est publié sous une publication.", body: "Merci pour votre message. Nous comprenons votre réaction et nous vous répondons en privé dans l'heure." })),
    { kind: "crise" as const, level: "faible" as const, title: "Critique isolée", situation: "Un commentaire négatif sans reprise.", body: "1. Répondre sous 2 heures. 2. Proposer d'échanger en privé. 3. Ne rien supprimer sauf insulte." },
    { kind: "crise" as const, level: "moyen" as const, title: "Critique reprise par plusieurs personnes", situation: "Plusieurs commentaires ou partages.", body: "1. Prévenir le responsable. 2. Publier une réponse unique et factuelle. 3. Suspendre les publications prévues." },
    { kind: "crise" as const, level: "grave" as const, title: "Information fausse ou atteinte à la réputation", situation: "Rumeur large ou accusation grave.", body: "1. Alerter la direction immédiatement. 2. Suspendre toutes les publications. 3. Publier un communiqué validé par la direction." },
  ],
});
