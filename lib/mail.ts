export type MailResult = { ok: true } | { ok: false; reason: "not_configured" | "failed" };

/** Envoi d'un e-mail par l'API Resend. Sans RESEND_API_KEY et MAIL_FROM, rien n'est envoyé (« not_configured »). */
export async function sendMail(to: string, mail: { subject: string; text: string; html: string }, fetchImpl: typeof fetch = fetch): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();
  if (!key || !from) return { ok: false, reason: "not_configured" };
  try {
    const res = await fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: mail.subject, text: mail.text, html: mail.html }),
    });
    return res.ok ? { ok: true } : { ok: false, reason: "failed" };
  } catch {
    return { ok: false, reason: "failed" };
  }
}
