import IdentityTab, { type Identity } from "@/components/IdentityTab";
import { getDashboardContext } from "@/lib/brand";
import { parseVisualGuide } from "@/lib/identity";
import { PLANS } from "@/lib/plans";
import { footerBrand } from "@/lib/whiteLabel";
import CharterTab from "@/components/CharterTab";
import ToneTab from "@/components/ToneTab";
import { ToneSection, type ToneRow } from "@/components/StrategyBlocks";

export default async function IdentityPage() {
  const { supabase, user, active, plan } = await getDashboardContext();
  const { data } = await supabase
    .from("brand_identity")
    .select("positioning, target_segments, visual_palette, marketing_objectives, questionnaire, foundations, visual_guide, tone_table, rewrite, logo_note")
    .eq("brand_profile_id", active.id)
    .maybeSingle();
  // Rapports KPI : avancement des objectifs mesurés (aucun pour un palier sans suivi KPI).
  const { data: kpi } = await supabase.from("kpi_reports").select("month, data").eq("brand_profile_id", active.id).order("month", { ascending: false }).limit(36);
  const { data: toneRow } = await supabase.from("tone_voice").select("do_list, dont_list").eq("brand_profile_id", active.id).maybeSingle();
  const tone = Array.isArray(data?.tone_table) ? (data?.tone_table as ToneRow[]) : [];
  return (
    <>
    <IdentityTab
      key={active.id}
      brandId={active.id}
      brandName={active.name}
      sector={active.sector ?? ""}
      initial={(data as Identity | null) ?? null}
      kpiReports={kpi ?? []}
    />
    {tone.length > 0 && <ToneSection rows={tone} rewrite={(data?.rewrite as { avoid: string; follow: string } | null) ?? null} logoNote={(data?.logo_note as string | null) ?? null} />}
    <div id="charter" className="mt-12 scroll-mt-6">
      <CharterTab embedded key={`charter-${active.id}`} brandId={active.id} brandName={active.name} brandColor={active.primary_color} logoUrl={active.logo_url}
        hasIdentity={!!data?.positioning} palette={(data?.visual_palette as { color: string; usage: string }[] | null) ?? []} guide={parseVisualGuide(data?.visual_guide)}
        watermark={PLANS[plan].exportWatermark} footer={footerBrand(plan, user.user_metadata)} />
    </div>
    <div id="tone" className="mt-12 scroll-mt-6">
      <ToneTab embedded key={`tone-${active.id}`} brandId={active.id} hasIdentity={!!data?.positioning}
        initial={toneRow ? { do_list: (toneRow.do_list as string[]) ?? [], dont_list: (toneRow.dont_list as string[]) ?? [] } : null} />
    </div>
    </>
  );
}
