import { z } from "zod";

export const identityOutput = z.object({
  positioning: z.string().min(1),
  target_segments: z
    .array(z.object({ name: z.string(), description: z.string(), need: z.string() }))
    .min(1),
  visual_palette: z.array(z.object({ color: z.string(), usage: z.string() })).min(1),
  marketing_objectives: z.array(z.string()).min(1),
});

export const pillarsOutput = z.object({
  pillars: z
    .array(
      z.object({
        name: z.string().min(1),
        description: z.string(),
        examples: z.array(z.string()),
      }),
    )
    .min(3)
    .max(5),
});

export const toneOutput = z.object({
  do_list: z.array(z.string()).min(1),
  dont_list: z.array(z.string()).min(1),
});

export const editorialEntry = z.object({
  week_number: z.number().int(),
  theme: z.string().min(1),
  content_type: z.string(),
  format: z.string(),
  frequency: z.string(),
  suggested_time: z.string(),
});
export const editorialOutput = z.object({ entries: z.array(editorialEntry).min(1) });
export type EditorialOutput = z.infer<typeof editorialOutput>;
export type EditorialEntryOutput = z.infer<typeof editorialEntry>;

export const PRIORITIES = ["faible", "modere", "eleve"] as const;
export const auditOutput = z.object({
  score: z.number().min(0).max(100),
  summary: z.string().min(1),
  strengths: z.array(z.object({ title: z.string(), description: z.string() })),
  improvements: z.array(
    z.object({ title: z.string(), description: z.string(), priority: z.enum(PRIORITIES) }),
  ),
});
export type AuditOutput = z.infer<typeof auditOutput>;

export const liveStep = z.object({ time_range: z.string(), title: z.string().min(1), description: z.string() });
export const liveStructureOutput = z.object({ steps: z.array(liveStep).min(3).max(8) });
export const liveStepOutput = z.object({ steps: z.array(liveStep).length(1) });
export const liveScriptsOutput = z.object({
  scripts: z.array(z.object({ situation: z.string().min(1), content: z.string().min(1) })).min(1).max(8),
  quick_replies: z.array(z.object({ situation: z.string().min(1), content: z.string().min(1) })).max(8),
});
export type LiveStructureOutput = z.infer<typeof liveStructureOutput>;
export type LiveScriptsOutput = z.infer<typeof liveScriptsOutput>;

export type IdentityOutput = z.infer<typeof identityOutput>;
export type PillarsOutput = z.infer<typeof pillarsOutput>;
export type ToneOutput = z.infer<typeof toneOutput>;

export const CHANNELS = ["Facebook", "Instagram", "TikTok", "YouTube", "LinkedIn", "WhatsApp", "Site web", "Autre"] as const;
export const GOALS = ["notoriete", "conversion", "fidelisation", "recrutement"] as const;

export const questionnaireSchema = z.object({
  brand_name: z.string().min(1).max(120),
  sector: z.string().max(120).default(""),
  offer: z.string().min(1).max(500),
  segments: z
    .array(z.string().min(1).max(300))
    .min(1)
    .max(3),
  problem: z.string().min(1).max(600),
  differentiation: z.string().min(1).max(600),
  personality: z.array(z.string().min(1).max(40)).length(3),
  goal: z.enum(GOALS),
  channels: z.array(z.string().max(40)).min(1).max(10),
  avoid: z.string().max(600).optional().default(""),
});
export type Questionnaire = z.infer<typeof questionnaireSchema>;

export const generateRequest = z.discriminatedUnion("type", [
  z.object({ type: z.literal("identity"), brand_profile_id: z.string().uuid(), questionnaire: questionnaireSchema }),
  z.object({ type: z.literal("pillars"), brand_profile_id: z.string().uuid() }),
  z.object({ type: z.literal("tone"), brand_profile_id: z.string().uuid() }),
  z.object({
    type: z.literal("audit"),
    brand_profile_id: z.string().uuid(),
    audit_id: z.string().uuid(),
    files: z.array(z.string().max(300)).min(1).max(5),
  }),
  z.object({ type: z.literal("live_structure"), live_guide_id: z.string().uuid() }),
  z.object({ type: z.literal("live_step"), live_guide_id: z.string().uuid(), step_index: z.number().int().min(0).max(20) }),
  z.object({ type: z.literal("live_scripts"), live_guide_id: z.string().uuid() }),
  z.object({ type: z.literal("editorial_line"), editorial_line_id: z.string().uuid() }),
  z.object({ type: z.literal("editorial_week"), entry_id: z.string().uuid() }),
]);
export type GenerateRequest = z.infer<typeof generateRequest>;
