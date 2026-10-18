import type Anthropic from "@anthropic-ai/sdk";
import { after, NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { MAX_FILE_BYTES, MAX_TOTAL_BYTES } from "@/lib/audit";
import { normalizeObjectives } from "@/lib/objectives";
import { hasFeature, isPlanId, type Feature } from "@/lib/plans";
import { consumeQuota, quotaMessage, refundQuota } from "@/lib/quota";
import { handlePlan, type PlanRequest } from "@/lib/plan/handler";
import { handleIdeas, handlePersonas, handlePillars } from "@/lib/strategy/handlers";
import { CREDITS } from "@/lib/plan/store";
import type { Gen } from "@/lib/plan/stages";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/payments/admin";
import { createJob, deleteJob, finishJob, getJob, purgeOldJobs } from "@/lib/jobs";
import { AiError, AI_MESSAGES, generateJson } from "@/lib/ai/anthropic";
import { mockAudit, mockLiveScripts, mockLiveStructure, mockEditorial, mockPosts, mockPostsFill, mockIdentity, mockExtend, mockTone } from "@/lib/ai/mock";
import { liveScriptsPrompt, liveStepPrompt, liveStructurePrompt, type LiveContext, auditPrompt, editorialLinePrompt, editorialWeekPrompt, postsWeekPrompt, postsFillPrompt, identityPrompt, identityExtendPrompt, tonePrompt, type BrandContext, type EditorialContext } from "@/lib/ai/prompts";
import type { LiveStep } from "@/lib/lives";
import { rateLimit } from "@/lib/rateLimit";
import { handleAssistant } from "@/lib/assistant/handler";
import { handleCommunity } from "@/lib/community/handler";
import { OBJECTIVES, type Objective } from "@/lib/lives";
import { pillarRotation, weeksForPeriod, type PeriodMonths } from "@/lib/editorial";
import { identityExtendOutput, parseFoundations } from "@/lib/identity";
import { addDays, hashtagsText, postsFillOutput, postsOutput, postsPerWeek, spreadDays, weekStartDate } from "@/lib/posts";
import { liveScriptsOutput, liveStepOutput, liveStructureOutput, auditOutput, editorialOutput, generateRequest, type GenerateRequest, identityOutput, toneOutput } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 300;

function fail(status: number, error: string, code = "error") {
  return NextResponse.json({ ok: false, code, error }, { status });
}

const requestId = z.object({ request_id: z.string().uuid() });

/**
 * Génération en arrière-plan : la route valide, réserve la demande (idempotente) et le crédit, lance le travail, puis répond
 * tout de suite (202). Le navigateur consulte ensuite la demande (table ai_jobs) par de petites requêtes : une coupure de
 * connexion pendant l'attente ne perd plus rien, et rejouer la même demande ne consomme pas de nouveau crédit.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Connexion requise.", "unauthorized");
  // Plafond de rafale par utilisateur (le quota quotidien reste le vrai contrôle de coût) : large pour la construction d'un plan, qui enchaîne les étapes.
  if (!(await rateLimit(`generate:${user.id}`, 120, 600))) return fail(429, "Trop de demandes en peu de temps. Patientez quelques minutes.", "rate_limited");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Requête invalide.", "bad_request");
  }
  const rid = requestId.safeParse(body);
  const parsed = generateRequest.safeParse(body);
  if (!rid.success || !parsed.success) return fail(400, "Données invalides. Vérifiez les champs du formulaire.", "bad_request");
  const req = parsed.data;
  const jobId = rid.data.request_id;

  const owner = isAdmin(user);
  const { data: planRaw } = await supabase.rpc("my_plan");
  const plan = owner ? "agence" : isPlanId(planRaw) ? planRaw : "gratuit";
  const feature = requiredFeature(req.type);
  if (feature && !hasFeature(plan, feature)) {
    return fail(403, "Cette fonctionnalité est réservée aux paliers payants.", "plan_required");
  }

  const admin = createAdminClient();
  // Idempotence : la même demande rejouée retrouve la ligne existante (sans relancer le travail ni consommer de crédit).
  const created = await createJob(admin, { id: jobId, userId: user.id, type: req.type });
  if (!created.ok) {
    if (created.reason === "exists") {
      const existing = await getJob(admin, jobId);
      if (existing && existing.user_id === user.id) return NextResponse.json({ ok: true, job: { id: jobId, status: existing.status } }, { status: 202 });
      return fail(409, "Cette demande existe déjà.", "conflict");
    }
    return fail(503, "Le service est momentanément indisponible. Réessayez dans un instant.", "jobs_unavailable");
  }
  if (Math.random() < 0.02) void purgeOldJobs(admin).catch(() => undefined);

  // Quota quotidien : consommé avant le travail, rendu si la génération échoue. Le propriétaire n'a aucun quota.
  // Une construction de plan coûte plusieurs crédits, une seule fois (à la préparation) ; ses étapes suivantes sont gratuites.
  const credits = owner ? 0 : creditsFor(req);
  let charged = 0;
  for (; charged < credits; charged++) {
    let quota;
    try {
      quota = await consumeQuota(user.id, plan);
    } catch {
      for (let i = 0; i < charged; i++) await refundQuota(user.id).catch(() => undefined);
      await deleteJob(admin, jobId).catch(() => undefined);
      return fail(503, "Le service est momentanément indisponible. Réessayez dans un instant.", "quota_unavailable");
    }
    if (!quota.ok) {
      for (let i = 0; i < charged; i++) await refundQuota(user.id).catch(() => undefined);
      await deleteJob(admin, jobId).catch(() => undefined);
      return fail(429, quotaMessage(plan, quota.limit), "quota");
    }
  }

  after(async () => {
    let outcome: { ok: boolean; body: unknown; status: number };
    try {
      const response = await run(supabase, req);
      const text = await response.text();
      let parsedBody: unknown;
      try {
        parsedBody = JSON.parse(text);
      } catch {
        parsedBody = { ok: false, code: "unknown", error: AI_MESSAGES.unknown };
      }
      outcome = { ok: response.ok, body: parsedBody, status: response.status };
    } catch {
      outcome = { ok: false, body: { ok: false, code: "unknown", error: AI_MESSAGES.unknown }, status: 500 };
    }
    if (!outcome.ok) for (let i = 0; i < charged; i++) await refundQuota(user.id).catch(() => undefined);
    await finishJob(admin, jobId, outcome).catch(() => undefined);
  });

  return NextResponse.json({ ok: true, job: { id: jobId, status: "running" } }, { status: 202 });
}

async function run(supabase: Supa, req: GenerateRequest): Promise<NextResponse> {
  try {
    if (req.type === "editorial_line" || req.type === "editorial_week") {
      return await handleEditorial(supabase, req);
    }
    if (req.type === "posts_week") return await handlePosts(supabase, req);
    if (req.type === "post_write") return await handlePostWrite(supabase, req);
    if (req.type === "plan_extract" || req.type === "plan_stage" || req.type === "personas" || req.type === "community" || req.type === "assistant" || req.type === "pillars" || req.type === "ideas") {
      const gen: Gen = (prompt, schema, tier = "heavy", mock) => generateJson(prompt, schema, mock ?? (() => { throw new Error("réponse simulée manquante"); }), tier, { thinking: "off", maxTokens: 8192 });
      const out =
        req.type === "personas" ? await handlePersonas(supabase, req.brand_profile_id, gen)
        : req.type === "assistant" ? await handleAssistant(supabase, req.brand_profile_id, req.task, req.input, gen)
        : req.type === "community" ? await handleCommunity(supabase, req.brand_profile_id, gen)
        : req.type === "pillars" ? await handlePillars(supabase, req.brand_profile_id, req.brief ?? { priority: "notoriete", problem: "" }, gen)
        : req.type === "ideas" ? await handleIdeas(supabase, req.brand_profile_id, req.pillar_id, req.count, gen)
        : await handlePlan(supabase, req as PlanRequest, gen);
      return NextResponse.json(out.body, { status: out.status });
    }
    if (req.type === "live_structure" || req.type === "live_step" || req.type === "live_scripts") {
      return await handleLives(supabase, req);
    }
  } catch (err) {
    if (err instanceof AiError) return fail(err.code === "not_configured" ? 503 : 502, err.message, err.code);
    return fail(500, AI_MESSAGES.unknown, "unknown");
  }

  // RLS : ne renvoie le profil que s'il appartient à l'utilisateur connecté.
  const { data: brand } = await supabase
    .from("brand_profiles")
    .select("id, name, sector, primary_color")
    .eq("id", req.brand_profile_id)
    .maybeSingle();
  if (!brand) return fail(404, "Profil de marque introuvable.", "not_found");

  try {
    if (req.type === "identity") {
      const generated = await generateJson(identityPrompt(req.questionnaire, brand.primary_color), identityOutput, mockIdentity, "heavy");
      // Objectifs normalisés (texte + mesure facultative) : un même format en base quel que soit le modèle.
      const objectives = normalizeObjectives(generated.marketing_objectives);
      const result = { ...generated, marketing_objectives: objectives };
      const { error } = await supabase.from("brand_identity").upsert(
        {
          brand_profile_id: brand.id,
          positioning: result.positioning,
          target_segments: result.target_segments,
          visual_palette: result.visual_palette,
          marketing_objectives: objectives,
          foundations: result.foundations ?? null,
          visual_guide: result.visual_guide ?? null,
          questionnaire: req.questionnaire,
        },
        { onConflict: "brand_profile_id" },
      );
      if (error) return fail(500, "L'identité n'a pas pu être enregistrée.", "db");
      return NextResponse.json({ ok: true, data: result });
    }

    if (req.type === "identity_extend") {
      const { data: existing } = await supabase
        .from("brand_identity")
        .select("positioning, target_segments, visual_palette, marketing_objectives, questionnaire")
        .eq("brand_profile_id", brand.id)
        .maybeSingle();
      if (!existing?.positioning) return fail(409, "Générez d'abord l'identité de marque.", "identity_missing");
      const result = await generateJson(
        identityExtendPrompt({ name: brand.name, sector: brand.sector, identity: existing, questionnaire: existing.questionnaire }),
        identityExtendOutput,
        mockExtend,
        "heavy",
      );
      const { error } = await supabase.from("brand_identity").update({ foundations: result.foundations, visual_guide: result.visual_guide }).eq("brand_profile_id", brand.id);
      if (error) return fail(500, "Les fondations n'ont pas pu être enregistrées.", "db");
      return NextResponse.json({ ok: true, data: result });
    }

    if (req.type === "audit") return await handleAudit(supabase, brand, req);

    // tone : contexte = identité existante
    const { data: identity } = await supabase
      .from("brand_identity")
      .select("positioning, target_segments, visual_palette, marketing_objectives")
      .eq("brand_profile_id", brand.id)
      .maybeSingle();
    if (!identity?.positioning) {
      return fail(409, "Générez d'abord l'identité de marque.", "identity_missing");
    }
    const ctx: BrandContext = { name: brand.name, sector: brand.sector, identity };

    const result = await generateJson(tonePrompt(ctx), toneOutput, mockTone, "light");
    const { error } = await supabase.from("tone_voice").upsert(
      { brand_profile_id: brand.id, do_list: result.do_list, dont_list: result.dont_list },
      { onConflict: "brand_profile_id" },
    );
    if (error) return fail(500, "La tonalité n'a pas pu être enregistrée.", "db");
    return NextResponse.json({ ok: true, data: result });
  } catch (err) {
    if (err instanceof AiError) return fail(err.code === "not_configured" ? 503 : 502, err.message, err.code);
    return fail(500, AI_MESSAGES.unknown, "unknown");
  }
}

type Supa = Awaited<ReturnType<typeof createClient>>;

function creditsFor(req: GenerateRequest): number {
  if (req.type === "plan_extract") return CREDITS.extract;
  if (req.type === "plan_stage") return req.stage === "start" ? CREDITS.start : 0;
  return 1;
}

function requiredFeature(type: string): Feature | null {
  if (type.startsWith("plan_")) return "editorial";
  if (type === "audit") return "audit";
  if (type.startsWith("editorial") || type.startsWith("posts") || type === "post_write") return "editorial";
  if (type.startsWith("live_")) return "lives";
  return null;
}

/** Charge ligne + marque + piliers + tonalité (RLS : uniquement si la ligne appartient à l'utilisateur). */
async function loadEditorialContext(supabase: Supa, lineId: string) {
  const { data: line } = await supabase
    .from("editorial_lines")
    .select("id, channel, period_start, period_end, brand_profile_id")
    .eq("id", lineId)
    .maybeSingle();
  if (!line) return null;
  const [{ data: brand }, { data: pillars }, { data: tone }] = await Promise.all([
    supabase.from("brand_profiles").select("name, sector").eq("id", line.brand_profile_id).maybeSingle(),
    supabase.from("content_pillars").select("name, description").eq("brand_profile_id", line.brand_profile_id),
    supabase.from("tone_voice").select("do_list, dont_list").eq("brand_profile_id", line.brand_profile_id).maybeSingle(),
  ]);
  if (!brand) return null;
  const ctx: EditorialContext = {
    channel: line.channel ?? "",
    brand: { name: brand.name, sector: brand.sector },
    pillars: pillars ?? [],
    tone: tone ?? null,
  };
  const months: PeriodMonths = line.period_start && line.period_end && daysBetween(line.period_start, line.period_end) > 45 ? 3 : 1;
  return { line, ctx, weeks: weeksForPeriod(months) };
}

function daysBetween(a: string, b: string) {
  return (Date.parse(b) - Date.parse(a)) / 86_400_000;
}

/** Rédige les publications d'une semaine de la ligne éditoriale ; remplace les brouillons de cette semaine, jamais les publications prêtes ou publiées. */
async function handlePosts(supabase: Supa, req: { type: "posts_week"; entry_id: string }) {
  const { data: entry } = await supabase
    .from("editorial_entries")
    .select("id, week_number, theme, content_type, format, frequency, suggested_time, editorial_line_id")
    .eq("id", req.entry_id)
    .maybeSingle();
  if (!entry) return fail(404, "Semaine introuvable.", "not_found");
  const loaded = await loadEditorialContext(supabase, entry.editorial_line_id);
  if (!loaded) return fail(404, "Ligne éditoriale introuvable.", "not_found");
  const { line, ctx } = loaded;
  if (!line.period_start) return fail(409, "Cette ligne éditoriale n'a pas de date de début.", "no_period");
  const { data: identity } = await supabase.from("brand_identity").select("foundations").eq("brand_profile_id", line.brand_profile_id).maybeSingle();
  const foundations = parseFoundations(identity?.foundations);

  // Publications déjà prévues par le plan : on rédige leurs légendes (sans changer le projet de chacune).
  const { data: planned } = await supabase.from("posts").select("id, scheduled_date, idea, hook, pillar, format").eq("editorial_entry_id", entry.id).eq("status", "brouillon").neq("idea", "").order("scheduled_date");
  if (planned && planned.length > 0) {
    const n = await fillCaptions(supabase, ctx, { theme: entry.theme, phase: null, campaign: null }, foundations, planned);
    if (n === null) return fail(500, "Les légendes n'ont pas pu être enregistrées.", "db");
    return NextResponse.json({ ok: true, data: { count: n } });
  }

  const days = spreadDays(postsPerWeek(entry.frequency));
  const result = await generateJson(
    postsWeekPrompt({ ...ctx, foundations: foundations ? { slogan: foundations.slogan, key_message: foundations.key_message, promise: foundations.promise } : null }, entry, days),
    postsOutput,
    () => mockPosts(days),
    "heavy",
  );

  const start = weekStartDate(line.period_start, entry.week_number ?? 1);
  const rows = result.posts.map((p) => ({
    brand_profile_id: line.brand_profile_id,
    editorial_entry_id: entry.id,
    channel: line.channel,
    scheduled_date: addDays(start, p.day_offset),
    caption: p.caption,
    visual_idea: p.visual_idea,
    hashtags: hashtagsText(p.hashtags),
    call_to_action: p.call_to_action,
    status: "brouillon",
  }));
  const { error: delErr } = await supabase.from("posts").delete().eq("editorial_entry_id", entry.id).eq("status", "brouillon");
  if (delErr) return fail(500, "Les anciens brouillons n'ont pas pu être remplacés.", "db");
  const { error } = await supabase.from("posts").insert(rows);
  if (error) return fail(500, "Les publications n'ont pas pu être enregistrées.", "db");
  return NextResponse.json({ ok: true, data: { count: rows.length } });
}

type PlannedRow = { id: string; scheduled_date: string | null; idea: string | null; hook: string | null; pillar: string | null; format: string | null };

/** Rédige et enregistre les légendes de publications prévues ; renvoie leur nombre, ou null si l'enregistrement échoue. */
async function fillCaptions(
  supabase: Supa,
  ctx: EditorialContext,
  week: { theme: string | null; phase: string | null; campaign: string | null },
  foundations: ReturnType<typeof parseFoundations>,
  rows: PlannedRow[],
): Promise<number | null> {
  const dayName = (iso: string | null) => (iso ? new Intl.DateTimeFormat("fr-FR", { weekday: "long", timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z")) : "");
  const numbered = rows.map((r, n) => ({ n, day: dayName(r.scheduled_date), idea: r.idea ?? "", hook: r.hook ?? "", pillar: r.pillar, format: r.format }));
  const result = await generateJson(
    postsFillPrompt({ ...ctx, foundations: foundations ? { slogan: foundations.slogan, key_message: foundations.key_message, promise: foundations.promise } : null }, week, numbered),
    postsFillOutput,
    () => mockPostsFill(numbered.map((r) => r.n)),
    "heavy",
  );
  let saved = 0;
  for (const p of result.posts) {
    const row = rows[p.n];
    if (!row) continue;
    const { error } = await supabase.from("posts").update({ caption: p.caption, visual_idea: p.visual_idea, hashtags: hashtagsText(p.hashtags), call_to_action: p.call_to_action }).eq("id", row.id);
    if (error) return null;
    saved++;
  }
  return saved;
}

/** Une seule publication du plan : rédige sa légende. */
async function handlePostWrite(supabase: Supa, req: { type: "post_write"; post_id: string }) {
  const { data: post } = await supabase.from("posts").select("id, brand_profile_id, editorial_entry_id, channel, scheduled_date, idea, hook, pillar, format").eq("id", req.post_id).maybeSingle();
  if (!post) return fail(404, "Publication introuvable.", "not_found");
  const [{ data: brand }, { data: pillars }, { data: tone }, { data: identity }, entry] = await Promise.all([
    supabase.from("brand_profiles").select("name, sector").eq("id", post.brand_profile_id).maybeSingle(),
    supabase.from("content_pillars").select("name, description").eq("brand_profile_id", post.brand_profile_id),
    supabase.from("tone_voice").select("do_list, dont_list").eq("brand_profile_id", post.brand_profile_id).maybeSingle(),
    supabase.from("brand_identity").select("foundations").eq("brand_profile_id", post.brand_profile_id).maybeSingle(),
    post.editorial_entry_id ? supabase.from("editorial_entries").select("theme, phase, campaign").eq("id", post.editorial_entry_id).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  if (!brand) return fail(404, "Profil de marque introuvable.", "not_found");
  const ctx: EditorialContext = { channel: post.channel ?? "", brand: { name: brand.name, sector: brand.sector }, pillars: pillars ?? [], tone: tone ?? null };
  const week = { theme: (entry.data as { theme?: string } | null)?.theme ?? null, phase: (entry.data as { phase?: string } | null)?.phase ?? null, campaign: (entry.data as { campaign?: string } | null)?.campaign ?? null };
  const n = await fillCaptions(supabase, ctx, week, parseFoundations(identity?.foundations), [post as PlannedRow]);
  if (n === null) return fail(500, "La légende n'a pas pu être enregistrée.", "db");
  return NextResponse.json({ ok: true, data: { count: n } });
}

async function handleEditorial(
  supabase: Supa,
  req: { type: "editorial_line"; editorial_line_id: string } | { type: "editorial_week"; entry_id: string },
) {
  let lineId: string;
  let entry: { id: string; week_number: number | null; theme: string | null } | null = null;
  if (req.type === "editorial_week") {
    const { data } = await supabase
      .from("editorial_entries")
      .select("id, week_number, theme, editorial_line_id")
      .eq("id", req.entry_id)
      .maybeSingle();
    if (!data) return fail(404, "Entrée introuvable.", "not_found");
    entry = data;
    lineId = data.editorial_line_id;
  } else {
    lineId = req.editorial_line_id;
  }

  const loaded = await loadEditorialContext(supabase, lineId);
  if (!loaded) return fail(404, "Ligne éditoriale introuvable.", "not_found");
  const { ctx, weeks } = loaded;
  const names = ctx.pillars.map((p) => p.name).filter((n): n is string => !!n);
  if (names.length === 0) return fail(409, "Générez d'abord vos piliers de contenu.", "pillars_missing");

  if (req.type === "editorial_line") {
    const { count } = await supabase.from("editorial_entries").select("id", { count: "exact", head: true }).eq("editorial_line_id", lineId);
    if (count && count > 0) return fail(409, "Cette ligne éditoriale contient déjà des semaines.", "already_generated");
    const rotation = pillarRotation(names, weeks);
    const result = await generateJson(editorialLinePrompt(ctx, rotation), editorialOutput, () => mockEditorial(weeks), "heavy");
    const rows = result.entries.slice(0, weeks).map((e, i) => ({
      editorial_line_id: lineId,
      week_number: i + 1,
      position: i,
      theme: e.theme,
      content_type: e.content_type,
      format: e.format,
      frequency: e.frequency,
      suggested_time: e.suggested_time,
      status: "a_venir",
      validation_status: "non_requis",
    }));
    const { error } = await supabase.from("editorial_entries").insert(rows);
    if (error) return fail(500, "La ligne éditoriale n'a pas pu être enregistrée.", "db");
    return NextResponse.json({ ok: true });
  }

  // editorial_week : une seule semaine, sans toucher aux autres
  const weekNumber = entry!.week_number ?? 1;
  const rotation = pillarRotation(names, Math.max(weeks, weekNumber))[weekNumber - 1] ?? { week_number: weekNumber, primary: names[0], secondary: null };
  const { data: others } = await supabase.from("editorial_entries").select("theme").eq("editorial_line_id", lineId).neq("id", entry!.id);
  const result = await generateJson(
    editorialWeekPrompt(ctx, rotation, (others ?? []).map((o) => o.theme ?? "")),
    editorialOutput,
    () => ({ entries: [{ ...mockEditorial(1).entries[0], week_number: weekNumber, theme: `Nouveau thème semaine ${weekNumber} (${Date.now() % 1000})` }] }),
    "light",
  );
  const e = result.entries[0];
  const { error } = await supabase
    .from("editorial_entries")
    .update({
      theme: e.theme,
      content_type: e.content_type,
      format: e.format,
      frequency: e.frequency,
      suggested_time: e.suggested_time,
      status: "a_venir",
      validation_status: "non_requis",
      validated_by: null,
      validated_at: null,
      validation_requested_by: null,
      validation_requested_at: null,
    })
    .eq("id", entry!.id);
  if (error) return fail(500, "La semaine n'a pas pu être mise à jour.", "db");
  return NextResponse.json({ ok: true });
}

const MEDIA: Record<string, { kind: "image" | "document"; type: string }> = {
  png: { kind: "image", type: "image/png" },
  jpg: { kind: "image", type: "image/jpeg" },
  jpeg: { kind: "image", type: "image/jpeg" },
  pdf: { kind: "document", type: "application/pdf" },
};

async function handleAudit(
  supabase: Supa,
  brand: { id: string; name: string; sector: string | null },
  req: { audit_id: string; files: string[]; network: string },
) {
  const prefix = `${brand.id}/${req.audit_id}/`;
  const blocks: Anthropic.ContentBlockParam[] = [];
  let totalBytes = 0;

  for (const path of req.files) {
    // Les chemins doivent rester dans le dossier de cet audit (pas de ../).
    if (!path.startsWith(prefix) || path.includes("..") || path.slice(prefix.length).includes("/")) {
      return fail(400, "Fichier invalide.", "bad_request");
    }
    const ext = path.split(".").pop()?.toLowerCase() ?? "";
    const media = MEDIA[ext];
    if (!media) return fail(400, "Format non pris en charge (PNG, JPG ou PDF).", "bad_request");

    const { data: blob, error } = await supabase.storage.from("audits").download(path);
    if (error || !blob) return fail(404, "Un fichier de l'audit est introuvable. Redéposez-le.", "file_missing");
    if (blob.size > MAX_FILE_BYTES) return fail(400, "Un fichier dépasse 10 Mo.", "bad_request");
    totalBytes += blob.size;
    if (totalBytes > MAX_TOTAL_BYTES) return fail(400, "Le poids total des fichiers dépasse la limite d'un audit. Retirez un fichier.", "bad_request");
    const data = Buffer.from(await blob.arrayBuffer()).toString("base64");

    if (media.kind === "image") {
      blocks.push({ type: "image", source: { type: "base64", media_type: media.type as "image/png" | "image/jpeg", data } });
    } else {
      blocks.push({ type: "document", source: { type: "base64", media_type: "application/pdf", data } });
    }
  }

  const [{ data: identity }, { data: pillars }, { data: tone }] = await Promise.all([
    supabase.from("brand_identity").select("positioning, target_segments, visual_palette, marketing_objectives").eq("brand_profile_id", brand.id).maybeSingle(),
    supabase.from("content_pillars").select("name, description").eq("brand_profile_id", brand.id),
    supabase.from("tone_voice").select("do_list, dont_list").eq("brand_profile_id", brand.id).maybeSingle(),
  ]);
  blocks.push({ type: "text", text: auditPrompt({ network: req.network, name: brand.name, sector: brand.sector, identity, pillars, tone }) });

  const result = await generateJson(blocks, auditOutput, mockAudit, "heavy");
  // Le réseau analysé est ajouté par le serveur (jamais lu de la réponse de l'IA).
  const report = { ...result, network: req.network };
  const { error } = await supabase.from("audits").insert({
    id: req.audit_id,
    brand_profile_id: brand.id,
    source_files: req.files,
    report_data: report,
  });
  if (error) return fail(500, "Le rapport n'a pas pu être enregistré.", "db");
  return NextResponse.json({ ok: true, data: { id: req.audit_id, report } });
}

async function loadLiveContext(supabase: Supa, guideId: string) {
  const { data: guide } = await supabase
    .from("live_guides")
    .select("id, brand_profile_id, objective, structure_data")
    .eq("id", guideId)
    .maybeSingle();
  if (!guide || !OBJECTIVES.includes(guide.objective as Objective)) return null;
  const [{ data: brand }, { data: pillars }, { data: tone }] = await Promise.all([
    supabase.from("brand_profiles").select("name, sector").eq("id", guide.brand_profile_id).maybeSingle(),
    supabase.from("content_pillars").select("name, description").eq("brand_profile_id", guide.brand_profile_id),
    supabase.from("tone_voice").select("do_list, dont_list").eq("brand_profile_id", guide.brand_profile_id).maybeSingle(),
  ]);
  if (!brand) return null;
  const ctx: LiveContext = { objective: guide.objective as Objective, brand: { name: brand.name, sector: brand.sector }, pillars: pillars ?? [], tone: tone ?? null };
  return { guide, ctx };
}

async function handleLives(
  supabase: Supa,
  req: { type: "live_structure"; live_guide_id: string } | { type: "live_step"; live_guide_id: string; step_index: number } | { type: "live_scripts"; live_guide_id: string },
) {
  const loaded = await loadLiveContext(supabase, req.live_guide_id);
  if (!loaded) return fail(404, "Guide de live introuvable.", "not_found");
  const { guide, ctx } = loaded;

  if (req.type === "live_structure") {
    const result = await generateJson(liveStructurePrompt(ctx), liveStructureOutput, mockLiveStructure, "light");
    const { error } = await supabase.from("live_guides").update({ structure_data: { steps: result.steps } }).eq("id", guide.id);
    if (error) return fail(500, "La trame n'a pas pu être enregistrée.", "db");
    return NextResponse.json({ ok: true, data: { steps: result.steps } });
  }

  if (req.type === "live_step") {
    const steps = ((guide.structure_data as { steps?: LiveStep[] } | null)?.steps ?? []) as LiveStep[];
    const current = steps[req.step_index];
    if (!current) return fail(404, "Étape introuvable.", "not_found");
    const result = await generateJson(
      liveStepPrompt(ctx, current, req.step_index, steps.filter((_, i) => i !== req.step_index).map((s) => s.title)),
      liveStepOutput,
      () => ({ steps: [{ ...current, title: `${current.title} (nouvelle version)` }] }),
      "light",
    );
    const next = steps.map((s, i) => (i === req.step_index ? { ...result.steps[0], time_range: s.time_range } : s));
    const { error } = await supabase.from("live_guides").update({ structure_data: { steps: next } }).eq("id", guide.id);
    if (error) return fail(500, "L'étape n'a pas pu être mise à jour.", "db");
    return NextResponse.json({ ok: true, data: { steps: next } });
  }

  // live_scripts : remplace les scripts générés (les réponses rapides ajoutées à la main sont conservées)
  const result = await generateJson(liveScriptsPrompt(ctx), liveScriptsOutput, mockLiveScripts, "light");
  const { error: delErr } = await supabase.from("live_scripts").delete().eq("live_guide_id", guide.id).eq("is_quick_reply", false);
  if (delErr) return fail(500, "Les anciens scripts n'ont pas pu être remplacés.", "db");
  // Les réponses rapides existantes (générées ou ajoutées à la main) sont conservées : pas de doublons.
  const { count: quickCount } = await supabase.from("live_scripts").select("id", { count: "exact", head: true }).eq("live_guide_id", guide.id).eq("is_quick_reply", true);
  const rows = [
    ...result.scripts.map((x) => ({ live_guide_id: guide.id, situation: x.situation, content: x.content, is_quick_reply: false })),
    ...(quickCount ? [] : result.quick_replies).map((x) => ({ live_guide_id: guide.id, situation: x.situation, content: x.content, is_quick_reply: true })),
  ];
  const { error } = await supabase.from("live_scripts").insert(rows);
  if (error) return fail(500, "Les scripts n'ont pas pu être enregistrés.", "db");
  return NextResponse.json({ ok: true });
}
