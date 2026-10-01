import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { AiError, AI_MESSAGES, generateJson } from "@/lib/ai/anthropic";
import { mockIdentity, mockPillars, mockTone } from "@/lib/ai/mock";
import { identityPrompt, pillarsPrompt, tonePrompt, type BrandContext } from "@/lib/ai/prompts";
import { generateRequest, identityOutput, pillarsOutput, toneOutput } from "@/lib/ai/schemas";

export const runtime = "nodejs";
export const maxDuration = 120;

function fail(status: number, error: string, code = "error") {
  return NextResponse.json({ ok: false, code, error }, { status });
}

export async function POST(request: Request) {
  const supabase = createClient();
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
