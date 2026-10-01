import ToneTab from "@/components/ToneTab";
import { getDashboardContext } from "@/lib/brand";

export default async function TonePage() {
  const { supabase, active } = await getDashboardContext();
  const [{ data: tone }, { data: identity }] = await Promise.all([
    supabase.from("tone_voice").select("do_list, dont_list").eq("brand_profile_id", active.id).maybeSingle(),
    supabase.from("brand_identity").select("positioning").eq("brand_profile_id", active.id).maybeSingle(),
  ]);
  return (
    <ToneTab
      key={active.id}
      brandId={active.id}
      initial={tone ? { do_list: (tone.do_list as string[]) ?? [], dont_list: (tone.dont_list as string[]) ?? [] } : null}
      hasIdentity={!!identity?.positioning}
    />
  );
}
