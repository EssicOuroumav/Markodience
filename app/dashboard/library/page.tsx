import LibraryTab from "@/components/LibraryTab";
import { getDashboardContext } from "@/lib/brand";
import { lockedView } from "@/lib/gate";
import { isImage, type Asset } from "@/lib/library";
import { readBrandInfo } from "@/lib/brandInfo";
import type { MediaLink } from "@/components/LibraryTab";

export default async function LibraryPage() {
  const { supabase, active, plan } = await getDashboardContext();
  const locked = lockedView(plan, "library");
  if (locked) return locked;
  const { data: linkRows } = await supabase.from("media_links").select("id, label, url, kind").eq("brand_profile_id", active.id).order("position").order("created_at");
  const { data } = await supabase.from("assets").select("id, brand_profile_id, name, category, path, mime, size_bytes, created_at").eq("brand_profile_id", active.id).order("created_at", { ascending: false });
  const assets = (data as Asset[]) ?? [];
  // Aperçus : liens temporaires d'une heure (le dossier est privé).
  const images = assets.filter((a) => isImage(a.mime));
  const { data: signed } = images.length ? await supabase.storage.from("library").createSignedUrls(images.map((a) => a.path), 3600) : { data: [] };
  const urls = Object.fromEntries((signed ?? []).flatMap((d) => (d.signedUrl && d.path ? [[d.path, d.signedUrl] as const] : [])));
  return <LibraryTab key={active.id} brandId={active.id} initial={assets} initialUrls={urls} initialLinks={(linkRows as MediaLink[]) ?? []} ficheLinks={readBrandInfo(active).links} />;
}
