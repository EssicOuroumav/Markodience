import AssistantTab from "@/components/AssistantTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import { PLANS } from "@/lib/plans";
import { footerBrand } from "@/lib/whiteLabel";

export default async function AssistantPage() {
  const { supabase, user, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "kpi");
  if (locked) return locked;
  const { data: identity } = await supabase.from("brand_identity").select("positioning").eq("brand_profile_id", active.id).maybeSingle();
  return <AssistantTab key={active.id} brandId={active.id} brandName={active.name} brandColor={active.primary_color} hasIdentity={!!identity?.positioning} watermark={PLANS[plan].exportWatermark} footer={footerBrand(plan, user.user_metadata)} />;
}
