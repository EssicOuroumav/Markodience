import { NextResponse } from "next/server";
import { createClient as createPlainClient } from "@supabase/supabase-js";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { DELETE_PHRASE, purgeUserFiles } from "@/lib/account";
import { createAdminClient } from "@/lib/payments/admin";
import { createClient } from "@/lib/supabase/server";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const body = z.object({ password: z.string().min(1).max(200), confirm: z.string() });
const reply = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

/** Suppression définitive du compte et de toutes ses données. Exige le mot de passe et la saisie d'une phrase de confirmation. */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) return reply(401, "Connexion requise.");
  if (isAdmin(user)) return reply(400, "Le compte propriétaire ne peut pas être supprimé depuis cette page.");
  // Cette route teste un mot de passe : limite stricte pour qu'une session volée ne serve pas à le deviner.
  if (!(await rateLimit(`account-delete:${user.id}`, 5, 600))) return reply(429, "Trop d'essais. Patientez dix minutes.");

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success || parsed.data.confirm.trim() !== DELETE_PHRASE) return reply(400, `Tapez « ${DELETE_PHRASE} » pour confirmer.`);

  // Vérifie le mot de passe sur un client sans session (n'affecte pas la session en cours).
  const probe = createPlainClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: pwError } = await probe.auth.signInWithPassword({ email: user.email, password: parsed.data.password });
  if (pwError) return reply(403, "Mot de passe incorrect.");

  const admin = createAdminClient();
  const { data: brands } = await admin.from("brand_profiles").select("id").eq("user_id", user.id);
  await purgeUserFiles(admin, user.id, (brands ?? []).map((b) => b.id)).catch(() => undefined);
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return reply(500, "La suppression a échoué. Réessayez ou contactez-nous.");
  await supabase.auth.signOut().catch(() => undefined);
  return NextResponse.json({ ok: true });
}
