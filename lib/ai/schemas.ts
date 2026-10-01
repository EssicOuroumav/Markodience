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
]);
export type GenerateRequest = z.infer<typeof generateRequest>;
