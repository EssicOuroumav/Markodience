import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";
import { sendMail } from "@/lib/mail";
import { createAdminClient } from "@/lib/payments/admin";
import { buildReminders, DEFAULT_PREFS, renderReminderEmail, type BrandFacts, type ReminderPrefs } from "@/lib/reminders";
import { monthStart } from "@/lib/kpi";
import { addDays } from "@/lib/posts";
import { PLANS, isPlanId, hasFeature } from "@/lib/plans";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_USERS_PER_RUN = 300;

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Rappels quotidiens par e-mail, déclenchés par la tâche planifiée de Vercel (vercel.json).
 * Protégé par CRON_SECRET (Vercel l'envoie en « Authorization: Bearer … »). `?dry=1` : calcule sans rien envoyer ni enregistrer.
 * La réponse ne contient que des totaux, jamais d'adresse ni de contenu.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return NextResponse.json({ ok: false, error: "CRON_SECRET non configuré." }, { status: 503 });
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!safeEqual(given, secret)) return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });

  const dry = new URL(request.url).searchParams.get("dry") === "1";
  const configured = !!process.env.RESEND_API_KEY?.trim() && !!process.env.MAIL_FROM?.trim();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() || "https://markodience.vercel.app";
  const admin = createAdminClient();
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const tomorrow = addDays(today, 1);
  const prevMonth = monthStart(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)).toISOString().slice(0, 10));

  try {
    const [subs, brands, reports, posts, prefs, logged] = await Promise.all([
      admin.from("subscriptions").select("user_id, plan, status, current_period_end").neq("plan", "gratuit"),
      admin.from("brand_profiles").select("id, user_id, name, kpi_deadline_day"),
      admin.from("kpi_reports").select("brand_profile_id").eq("month", prevMonth).not("submitted_at", "is", null),
      admin.from("posts").select("brand_profile_id, scheduled_date").in("scheduled_date", [today, tomorrow]).neq("status", "publie"),
      admin.from("reminder_prefs").select("user_id, email_enabled, kpi, posts, billing"),
      admin.from("reminder_log").select("user_id").eq("day", today),
    ]);
    for (const r of [subs, brands, reports, posts, prefs, logged]) if (r.error) throw new Error(r.error.message);

    const submitted = new Set((reports.data ?? []).map((r) => r.brand_profile_id));
    const prefsBy = new Map((prefs.data ?? []).map((p) => [p.user_id, p as ReminderPrefs]));
    const done = new Set((logged.data ?? []).map((l) => l.user_id));

    const stats = { candidates: 0, sent: 0, failed: 0, skipped: 0 };
    let processed = 0;
    for (const sub of subs.data ?? []) {
      if (processed >= MAX_USERS_PER_RUN) break;
      const plan = isPlanId(sub.plan) ? sub.plan : "gratuit";
      const active = sub.status === "active" && (!sub.current_period_end || sub.current_period_end >= today);
      if (!active || plan === "gratuit") continue;
      processed++;

      const mine: BrandFacts[] = (brands.data ?? []).filter((b) => b.user_id === sub.user_id).map((b) => {
        const mineToday = (posts.data ?? []).filter((p) => p.brand_profile_id === b.id);
        return {
          name: b.name ?? "Votre marque",
          kpiDeadlineDay: b.kpi_deadline_day ?? 5,
          kpiPreviousSubmitted: submitted.has(b.id),
          kpiAvailable: hasFeature(plan, "kpi"),
          postsToday: mineToday.filter((p) => p.scheduled_date === today).length,
          postsTomorrow: mineToday.filter((p) => p.scheduled_date === tomorrow).length,
          postsAvailable: hasFeature(plan, "editorial"),
        };
      });
      const items = buildReminders(
        { brands: mine, billing: sub.current_period_end ? { plan: PLANS[plan].label, periodEnd: sub.current_period_end } : null },
        prefsBy.get(sub.user_id) ?? DEFAULT_PREFS,
        now,
      );
      if (items.length === 0) continue;
      stats.candidates++;
      if (dry || !configured) continue;
      if (done.has(sub.user_id)) { stats.skipped++; continue; }

      // Un seul message par jour : la ligne du journal est réservée avant l'envoi et libérée si l'envoi échoue.
      const claim = await admin.from("reminder_log").insert({ user_id: sub.user_id, day: today, items: items.length });
      if (claim.error) { stats.skipped++; continue; }
      const { data: u } = await admin.auth.admin.getUserById(sub.user_id);
      const email = u?.user?.email;
      const result = email ? await sendMail(email, renderReminderEmail(items, appUrl)) : ({ ok: false } as const);
      if (result.ok) stats.sent++;
      else {
        stats.failed++;
        await admin.from("reminder_log").delete().eq("user_id", sub.user_id).eq("day", today);
      }
    }
    if (stats.failed > 0) Sentry.captureMessage("Rappels : envois en échec", { level: "warning", extra: { failed: stats.failed, sent: stats.sent } });
    return NextResponse.json({ ok: true, dry, configured, ...stats });
  } catch (err) {
    Sentry.captureException(err);
    return NextResponse.json({ ok: false, error: "Le calcul des rappels a échoué." }, { status: 500 });
  }
}
