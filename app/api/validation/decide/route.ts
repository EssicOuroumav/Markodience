import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/payments/admin";
import { decideBody, decisionError } from "@/lib/validation";
import { loadRequest, recordDecision } from "@/lib/validationServer";

export const runtime = "nodejs";
const headers = { "Cache-Control": "no-store" };

/**
 * Décision d'un validateur, sans compte : le lien secret fait office de clé. La route ne révèle rien sur un lien inconnu
 * (même réponse qu'un lien expiré) et ne peut agir que sur les publications de la demande.
 */
export async function POST(request: Request) {
  const parsed = decideBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: "Demande invalide." }, { status: 400, headers });
  const problem = decisionError(parsed.data);
  if (problem) return NextResponse.json({ ok: false, error: problem }, { status: 400, headers });
  const admin = createAdminClient();
  const req = await loadRequest(admin, parsed.data.token);
  if (!req) return NextResponse.json({ ok: false, error: "Ce lien n'est pas valide." }, { status: 404, headers });
  const result = await recordDecision(admin, req, parsed.data.post_id, parsed.data.decision, parsed.data.comment);
  if (!result.ok) return NextResponse.json({ ok: false, error: result.error }, { status: result.status, headers });
  return NextResponse.json({ ok: true }, { headers });
}
