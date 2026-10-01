import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Retour du lien de confirmation d'email : échange le code contre une session, puis
 * redirige vers le tableau de bord (qui renvoie vers la création du profil si besoin).
 * La destination est fixe : aucun paramètre de redirection venant de l'URL (pas de redirection ouverte).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL("/dashboard", url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=confirmation", url.origin));
}
