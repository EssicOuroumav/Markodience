import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/** Désactive un lien de validation (le propriétaire seul, par la sécurité au niveau des lignes). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Connexion requise." }, { status: 401 });
  const body = z.object({ id: z.string().uuid() }).safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ ok: false, error: "Demande invalide." }, { status: 400 });
  const { data, error } = await supabase.from("validation_requests").update({ revoked_at: new Date().toISOString() }).eq("id", body.data.id).is("revoked_at", null).select("id");
  if (error) return NextResponse.json({ ok: false, error: "Le lien n'a pas pu être désactivé." }, { status: 500 });
  if (!data?.length) return NextResponse.json({ ok: false, error: "Lien introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
