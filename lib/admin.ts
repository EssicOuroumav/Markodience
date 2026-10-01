import { notFound } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

/** Le rôle vit dans app_metadata : modifiable uniquement avec la clé service (jamais par l'utilisateur). */
export const isAdmin = (user: Pick<User, "app_metadata"> | null | undefined) => user?.app_metadata?.role === "admin";

/** Pages admin : 404 pour tout autre visiteur, pour ne pas révéler l'existence de l'espace. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdmin(user)) notFound();
  return user;
}
