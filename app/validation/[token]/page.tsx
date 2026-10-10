import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import ValidationReview from "@/components/ValidationReview";
import BrandLogo from "@/components/BrandLogo";
import { createAdminClient } from "@/lib/payments/admin";
import { brandTheme } from "@/lib/theme";
import { requestState } from "@/lib/validation";
import { loadRequest, reviewPosts } from "@/lib/validationServer";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Validation de publications", robots: { index: false, follow: false }, referrer: "no-referrer" };

function Notice({ title, text }: { title: string; text: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-6 text-center">
      <ShieldCheck size={36} className="text-ink-secondary" />
      <h1 className="mt-4 text-[26px]">{title}</h1>
      <p className="mt-2 text-[16px] text-ink-secondary">{text}</p>
    </main>
  );
}

/** Page publique du validateur : accessible par le lien secret, sans compte. */
export default async function ValidationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const admin = createAdminClient();
  const req = await loadRequest(admin, token);
  // Un lien faux, expiré ou désactivé reçoit le même message : on ne confirme jamais l'existence d'un lien.
  if (!req || requestState(req) !== "ok") return <Notice title="Ce lien n'est plus valable" text="Il est expiré, désactivé ou incorrect. Demandez un nouveau lien à la personne qui vous l'a envoyé." />;
  const [posts, { data: brand }] = await Promise.all([reviewPosts(admin, req), admin.from("brand_profiles").select("name, logo_url, primary_color").eq("id", req.brand_profile_id).maybeSingle()]);
  return (
    <div className="studio min-h-screen bg-canvas" style={brandTheme(brand?.primary_color) as React.CSSProperties}>
      <header className="border-b border-[var(--color-border-soft)] bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-5 py-4">
          <BrandLogo src={brand?.logo_url ?? null} name={brand?.name ?? "Marque"} color={brand?.primary_color} size="sm" />
          <div><p className="text-[17px] font-semibold leading-tight">{brand?.name}</p><p className="caption">Validation de publications</p></div>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8">
        <h1 className="text-[28px]">Bonjour {req.reviewer},</h1>
        <p className="mt-1 text-[16px] text-ink-secondary">Voici {posts.length} publication{posts.length > 1 ? "s" : ""} à relire. Pour chacune, approuvez-la, ou dites ce qu&apos;il faut modifier.</p>
        {req.note && <p className="mt-4 rounded-2xl bg-white p-4 text-[15px] shadow-card"><span className="font-semibold">Message :</span> {req.note}</p>}
        <ValidationReview token={token} posts={posts} />
        <p className="caption mt-8">Ce lien est personnel et valable jusqu&apos;au {new Date(req.expires_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}. Ne le partagez pas.</p>
      </main>
    </div>
  );
}
