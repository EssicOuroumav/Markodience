import { NextResponse } from "next/server";
import { safeNext } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour du lien de confirmation d'email : échange le code contre une session, puis
 * redirige vers le tableau de bord (qui renvoie vers la création du profil si besoin).
 * La destination est choisie dans une liste blanche (lib/auth-redirect.ts) : pas de redirection ouverte.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(safeNext(url.searchParams.get("next")), url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
}
