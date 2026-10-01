import type Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { hasFeature, isPlanId, type Feature } from "@/lib/plans";
import { consumeQuota, quotaMessage, refundQuota } from "@/lib/quota";
import { createClient } from "@/lib/supabase/server";
import { AiError, AI_MESSAGES, generateJson } from "@/lib/ai/anthropic";
import { mockAudit, mockLiveScripts, mockLiveStructure, mockEditorial, mockIdentity, mockPillars, mockTone } from "@/lib/ai/mock";
import { liveScriptsPrompt, liveStepPrompt, liveStructurePrompt, type LiveContext, auditPrompt, editorialLinePrompt, editorialWeekPrompt, identityPrompt, pillarsPrompt, tonePrompt, type BrandContext, type EditorialContext } from "@/lib/ai/prompts";
import type { LiveStep } from "@/lib/lives";
import { OBJECTIVES, type Objective } from "@/lib/lives";
import { pillarRotation, weeksForPeriod, type PeriodMonths } from "@/lib/editorial";
import { liveScriptsOutput, liveStepOutput, liveStructureOutput, auditOutput, editorialOutput, generateRequest, type GenerateRequest, identityOutput, pillarsOutput, toneOutput } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

function fail(status: number, error: string, code = "error") {
  return NextResponse.json({ ok: false, code, error }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail(401, "Connexion requise.", "unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return fail(400, "Requête invalide.", "bad_request");
  }
  const parsed = generateRequest.safeParse(body);
  if (!parsed.success) return fail(400, "Données invalides. Vérifiez les champs du formulaire.", "bad_request");
  const req = parsed.data;

  const { data: planRaw } = await supabase.rpc("my_plan");
  const plan = isPlanId(planRaw) ? planRaw : "gratuit";
  const feature = requiredFeature(req.type);
  if (feature && !hasFeature(plan, feature)) {
    return fail(403, "Cette fonctionnalité est réservée aux paliers payants.", "plan_required");
  }

  // Quota quotidien : consommé avant l'appel, rendu si la génération échoue.
  let quota;
  try {
    quota = await consumeQuota(user.id, plan);
  } catch {
    return fail(503, "Le service est momentanément indisponible. Réessayez dans un instant.", "quota_unavailable");
  }
  if (!quota.ok) return fail(429, quotaMessage(plan, quota.limit), "quota");

  const response = await run(supabase, req);
  if (!response.ok) await refundQuota(user.id).catch(() => undefined);
  return response;
}

async function run(supabase: Supa, req: GenerateRequest): Promise<NextResponse> {
  try {
    if (req.type === "editorial_line" || req.type === "editorial_week") {
      return await handleEditorial(supabase, req);
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
    .select("id, name, sector")
    .eq("id", req.brand_profile_id)
    .maybeSingle();
  if (!brand) return fail(404, "Profil de marque introuvable.", "not_found");

  try {
    if (req.type === "identity") {
      const result = await generateJson(identityPrompt(req.questionnaire), identityOutput, mockIdentity);
      const { error } = await supabase.from("brand_identity").upsert(
        {
          brand_profile_id: brand.id,
          positioning: result.positioning,
          target_segments: result.target_segments,
          visual_palette: result.visual_palette,
          marketing_objectives: result.marketing_objectives,
          questionnaire: req.questionnaire,
        },
        { onConflict: "brand_profile_id" },
      );
      if (error) return fail(500, "L'identité n'a pas pu être enregistrée.", "db");
      return NextResponse.json({ ok: true, data: result });
    }

    if (req.type === "audit") return await handleAudit(supabase, brand, req);

    // pillars / tone : contexte = identité existante
    const { data: identity } = await supabase
      .from("brand_identity")
      .select("positioning, target_segments, visual_palette, marketing_objectives")
      .eq("brand_profile_id", brand.id)
      .maybeSingle();
    if (!identity?.positioning) {
      return fail(409, "Générez d'abord l'identité de marque.", "identity_missing");
    }
    const ctx: BrandContext = { name: brand.name, sector: brand.sector, identity };

    if (req.type === "pillars") {
      const result = await generateJson(pillarsPrompt(ctx), pillarsOutput, mockPillars);
      const { error: delErr } = await supabase.from("content_pillars").delete().eq("brand_profile_id", brand.id);
      if (delErr) return fail(500, "Les anciens piliers n'ont pas pu être remplacés.", "db");
      const { error } = await supabase.from("content_pillars").insert(
        result.pillars.map((p) => ({ brand_profile_id: brand.id, ...p })),
      );
      if (error) return fail(500, "Les piliers n'ont pas pu être enregistrés.", "db");
      return NextResponse.json({ ok: true, data: result });
    }

    const result = await generateJson(tonePrompt(ctx), toneOutput, mockTone);
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

function requiredFeature(type: string): Feature | null {
  if (type === "audit") return "audit";
  if (type.startsWith("editorial")) return "editorial";
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
    const result = await generateJson(editorialLinePrompt(ctx, rotation), editorialOutput, () => mockEditorial(weeks));
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
const MAX_FILE_BYTES = 10 * 1024 * 1024;

async function handleAudit(
  supabase: Supa,
  brand: { id: string; name: string; sector: string | null },
  req: { audit_id: string; files: string[] },
) {
  const prefix = `${brand.id}/${req.audit_id}/`;
  const blocks: Anthropic.ContentBlockParam[] = [];

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
  blocks.push({ type: "text", text: auditPrompt({ name: brand.name, sector: brand.sector, identity, pillars, tone }) });

  const result = await generateJson(blocks, auditOutput, mockAudit);
  const { error } = await supabase.from("audits").insert({
    id: req.audit_id,
    brand_profile_id: brand.id,
    source_files: req.files,
    report_data: result,
  });
  if (error) return fail(500, "Le rapport n'a pas pu être enregistré.", "db");
  return NextResponse.json({ ok: true, data: { id: req.audit_id, report: result } });
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
    const result = await generateJson(liveStructurePrompt(ctx), liveStructureOutput, mockLiveStructure);
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
    );
    const next = steps.map((s, i) => (i === req.step_index ? { ...result.steps[0], time_range: s.time_range } : s));
    const { error } = await supabase.from("live_guides").update({ structure_data: { steps: next } }).eq("id", guide.id);
    if (error) return fail(500, "L'étape n'a pas pu être mise à jour.", "db");
    return NextResponse.json({ ok: true, data: { steps: next } });
  }

  // live_scripts : remplace les scripts générés (les réponses rapides ajoutées à la main sont conservées)
  const result = await generateJson(liveScriptsPrompt(ctx), liveScriptsOutput, mockLiveScripts);
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
