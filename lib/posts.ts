import { z } from "zod";

export const POST_STATUSES = ["brouillon", "a_valider", "programme", "publie"] as const;
export type PostStatus = (typeof POST_STATUSES)[number];
export const POST_STATUS_LABEL: Record<PostStatus, string> = { brouillon: "Brouillon", a_valider: "À valider", programme: "Programmé", publie: "Publié" };

/** Prochaine étape du circuit : un brouillon se soumet, une publication à valider se valide, une publication programmée se publie. */
export const NEXT_STEP: Partial<Record<PostStatus, { to: PostStatus; label: string }>> = {
  brouillon: { to: "a_valider", label: "Demander la validation" },
  a_valider: { to: "programme", label: "Valider" },
  programme: { to: "publie", label: "Marquer comme publié" },
};
export const POST_FORMATS = ["Reel", "Carrousel", "Post", "Story", "Live", "Vidéo", "Article"] as const;
export const STATUS_CLS: Record<PostStatus, string> = { brouillon: "bg-black/10 text-ink", a_valider: "bg-warning/25 text-ink", programme: "bg-accent-soft text-accent", publie: "bg-success/25 text-ink" };
export const DOT_CLS: Record<PostStatus, string> = { brouillon: "bg-black/30", a_valider: "bg-warning", programme: "bg-accent", publie: "bg-success" };

/** Texte court d'une publication pour les vues compactes (kanban, liste) : légende, sinon accroche, sinon idée du plan. */
export const postTitle = (p: Pick<Post, "caption" | "hook" | "idea">) => (p.caption || p.hook || p.idea || "Sans texte").replace(/\s+/g, " ").trim().slice(0, 110);

export type Post = {
  id: string;
  brand_profile_id: string;
  editorial_entry_id: string | null;
  channel: string | null;
  scheduled_date: string | null;
  caption: string;
  visual_idea: string;
  hashtags: string;
  call_to_action: string;
  status: PostStatus;
  /** Publication prévue par le plan stratégique : idée, accroche, pilier et format (la légende vient ensuite). */
  idea?: string;
  hook?: string;
  pillar?: string | null;
  format?: string | null;
  assignee?: string | null;
  design_link?: string | null;
  review_note?: string | null;
  asset_id?: string | null;
};

/** Ce que l'IA renvoie pour une semaine : quelques publications réparties sur les jours (0 = premier jour de la semaine). */
export const postsOutput = z.object({
  posts: z
    .array(
      z.object({
        day_offset: z.number().int().min(0).max(6),
        caption: z.string().min(1).max(2200),
        visual_idea: z.string().max(600).default(""),
        hashtags: z.array(z.string().max(40)).max(12).default([]),
        call_to_action: z.string().max(240).default(""),
      }),
    )
    .min(1)
    .max(7),
});
export type PostsOutput = z.infer<typeof postsOutput>;

/** Légendes rédigées pour des publications déjà prévues par le plan (une entrée par ligne, dans l'ordre reçu). */
export const postsFillOutput = z.object({
  posts: z.array(z.object({ n: z.number().int().min(0).max(20), caption: z.string().min(1).max(2200), visual_idea: z.string().max(600).default(""), hashtags: z.array(z.string().max(40)).max(12).default([]), call_to_action: z.string().max(240).default("") })).min(1).max(12),
});
export type PostsFillOutput = z.infer<typeof postsFillOutput>;

export const hashtagsText = (tags: string[]) => tags.map((t) => "#" + t.replace(/^#+/, "").replace(/\s+/g, "")).filter((t) => t.length > 1).join(" ");

/** Nombre de publications de la semaine d'après « 3 posts par semaine » ; 3 par défaut, entre 1 et 5. */
export function postsPerWeek(frequency: string | null | undefined): number {
  const n = parseInt(/\d+/.exec(frequency ?? "")?.[0] ?? "", 10);
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 3;
}

const utc = (iso: string) => new Date(iso + "T00:00:00Z");
export const toIso = (d: Date) => d.toISOString().slice(0, 10);
export function addDays(iso: string, n: number): string {
  const d = utc(iso);
  d.setUTCDate(d.getUTCDate() + n);
  return toIso(d);
}
/** Premier jour de la semaine n (1 = semaine qui commence à la date de début de la période). */
export const weekStartDate = (periodStart: string, weekNumber: number) => addDays(periodStart, (Math.max(1, weekNumber) - 1) * 7);

/** Jours répartis sur la semaine : évite que trois publications tombent le même jour. */
export function spreadDays(count: number): number[] {
  const slots = [[0], [0, 3], [0, 2, 4], [0, 2, 4, 5], [0, 1, 3, 4, 6]];
  return slots[Math.min(Math.max(count, 1), 5) - 1];
}

/** Grille d'un mois, semaines du lundi au dimanche. */
export function monthGrid(year: number, month0: number): { iso: string; inMonth: boolean }[][] {
  const first = new Date(Date.UTC(year, month0, 1));
  const lead = (first.getUTCDay() + 6) % 7;
  const start = addDays(toIso(first), -lead);
  const weeks: { iso: string; inMonth: boolean }[][] = [];
  for (let w = 0; w < 6; w++) {
    const row = Array.from({ length: 7 }, (_, d) => {
      const iso = addDays(start, w * 7 + d);
      return { iso, inMonth: utc(iso).getUTCMonth() === month0 };
    });
    if (w >= 4 && !row.some((c) => c.inMonth)) break;
    weeks.push(row);
  }
  return weeks;
}

export const monthTitle = (year: number, month0: number) =>
  new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(year, month0, 1)));
export const dayTitle = (iso: string) =>
  new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(utc(iso));

export function groupByDate<T extends { scheduled_date: string | null }>(posts: T[]): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const p of posts) {
    if (!p.scheduled_date) continue;
    map.set(p.scheduled_date, [...(map.get(p.scheduled_date) ?? []), p]);
  }
  return map;
}

/** Texte prêt à coller dans le réseau : légende, appel à l'action, hashtags. */
export const postCopyText = (p: Pick<Post, "caption" | "call_to_action" | "hashtags">) =>
  [p.caption.trim(), p.call_to_action.trim(), p.hashtags.trim()].filter(Boolean).join("\n\n");
