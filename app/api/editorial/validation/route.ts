import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const body = z.object({ entry_id: z.string().uuid(), action: z.enum(["request", "validate"]) });

export async function POST(request: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: "Connexion requise." }, { status: 401 });

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Requête invalide." }, { status: 400 });
  const { entry_id, action } = parsed.data;

  // Le nom enregistré vient toujours de la session, jamais du client.
  const name = (user.user_metadata?.full_name as string | undefined) || user.email || "Utilisateur";
  const now = new Date().toISOString();

  const patch =
    action === "request"
      ? { validation_status: "en_attente", validation_requested_by: name, validation_requested_at: now, validated_by: null, validated_at: null }
      : { validation_status: "valide", validated_by: name, validated_at: now };

  // RLS : la mise à jour ne touche aucune ligne si l'entrée n'appartient pas à l'utilisateur.
  const { data, error } = await supabase.from("editorial_entries").update(patch).eq("id", entry_id).select("id").maybeSingle();
  if (error || !data) return NextResponse.json({ ok: false, error: "Entrée introuvable." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
