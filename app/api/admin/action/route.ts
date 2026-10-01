import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/payments/admin";
import { addMonths } from "@/lib/editorial";
import { normalizeSeats } from "@/lib/plans";
import { createClient } from "@/lib/supabase/server";

const uuid = z.string().uuid();
const body = z.discriminatedUnion("action", [
  z.object({ action: z.literal("set_plan"), user_id: uuid, plan: z.enum(["gratuit", "pro", "agence"]), months: z.number().int().min(1).max(36).nullable().optional(), seats: z.number().int().optional() }),
  z.object({ action: z.literal("reset_quota"), user_id: uuid }),
  z.object({ action: z.literal("suspend"), user_id: uuid }),
  z.object({ action: z.literal("unsuspend"), user_id: uuid }),
]);

const reply = (status: number, error: string) => NextResponse.json({ ok: false, error }, { status });

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  // 404 volontaire pour les non-administrateurs.
  if (!user || !isAdmin(user)) return reply(404, "Introuvable.");

  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return reply(400, "Requête invalide.");
  const req = parsed.data;
  if (req.user_id === user.id && (req.action === "suspend" || (req.action === "set_plan" && req.plan !== "agence"))) {
    return reply(400, "Vous ne pouvez pas rétrograder ni suspendre votre propre compte.");
  }

  const admin = createAdminClient();
  const { data: target } = await admin.auth.admin.getUserById(req.user_id);
  if (!target?.user) return reply(404, "Utilisateur introuvable.");

  if (req.action === "set_plan") {
    const start = new Date().toISOString().slice(0, 10);
    const seats = req.plan === "agence" ? normalizeSeats("agence", req.seats ?? 2) : 1;
    if (seats === null) return reply(400, "Le palier Agence demande entre 2 et 50 sièges.");
    const end = req.plan === "gratuit" || !req.months ? null : addMonths(start, req.months);
    const { error } = await admin.from("subscriptions").upsert(
      { user_id: req.user_id, plan: req.plan, seats, status: "active", payment_provider: "admin", current_period_start: start, current_period_end: end, renewal_date: end },
      { onConflict: "user_id" },
    );
    if (error) return reply(500, "Le palier n'a pas pu être modifié.");
  } else if (req.action === "reset_quota") {
    const { error } = await admin.from("ai_usage").delete().eq("user_id", req.user_id).eq("day", new Date().toISOString().slice(0, 10));
    if (error) return reply(500, "Le quota n'a pas pu être réinitialisé.");
  } else {
    const { error } = await admin.auth.admin.updateUserById(req.user_id, { ban_duration: req.action === "suspend" ? "876000h" : "none" });
    if (error) return reply(500, "L'opération a échoué.");
  }
  return NextResponse.json({ ok: true });
}
