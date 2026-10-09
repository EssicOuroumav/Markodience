import CharterTab from "@/components/CharterTab";
import { getDashboardContext } from "@/lib/brand";
import { footerBrand } from "@/lib/whiteLabel";
import { PLANS } from "@/lib/plans";
import { parseVisualGuide } from "@/lib/identity";

export default async function CharterPage() {
  const { supabase, user, active, plan } = await getDashboardContext();
  const { data } = await supabase.from("brand_identity").select("positioning, visual_palette, visual_guide").eq("brand_profile_id", active.id).maybeSingle();
  return (
    <CharterTab
      key={active.id}
      brandId={active.id}
      brandName={active.name}
      brandColor={active.primary_color}
      logoUrl={active.logo_url}
      hasIdentity={!!data?.positioning}
      palette={(data?.visual_palette as { color: string; usage: string }[] | null) ?? []}
      guide={parseVisualGuide(data?.visual_guide)}
      watermark={PLANS[plan].exportWatermark}
      footer={footerBrand(plan, user.user_metadata)}
    />
  );
}
