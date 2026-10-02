import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

/** TEMPORAIRE : vérifie que Sentry reçoit les erreurs serveur. Réservé au propriétaire ; à supprimer après le test. */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) return NextResponse.json({ ok: false }, { status: 404 });
  throw new Error("Test Sentry : erreur serveur volontaire (propriétaire)");
}
