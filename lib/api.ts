import { notifyProgress } from "./progressEvents";

/** `network` : plus aucune nouvelle de la demande (le serveur a pu la terminer : rechargez la page). */
export type GenerateResult = { ok: true; data: unknown } | { ok: false; error: string; network?: boolean };

export type JobSnapshot = { status: "running" | "done" | "error"; result: unknown } | null;
type Outcome = { ok?: boolean; data?: unknown; error?: string } | null;

/** Dépendances injectables (tests) : par défaut, `fetch`, la table ai_jobs lue avec la session de l'utilisateur, et l'horloge. */
export type GenerateDeps = {
  fetchImpl?: typeof fetch;
  poll?: (id: string) => Promise<JobSnapshot>;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
  newId?: () => string;
};

const DEADLINE_MS = 150_000;
const SUBMIT_ATTEMPTS = 4;
const SLOW_MESSAGE = "La génération prend plus de temps que prévu. Rechargez la page dans une minute : le résultat sera là.";

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

async function defaultPoll(id: string): Promise<JobSnapshot> {
  const { createClient } = await import("./supabase/client");
  const { data } = await createClient().from("ai_jobs").select("status, result").eq("id", id).maybeSingle();
  return (data as JobSnapshot) ?? null;
}

/**
 * Lance une génération et en attend le résultat, sans dépendre d'une longue connexion :
 *  1. envoi de la demande, identifiée par un identifiant que le serveur retient (rejouer l'envoi est sans risque : même
 *     demande, pas de double travail ni de double crédit) ; en cas de coupure, nouvel essai automatique ;
 *  2. le serveur répond tout de suite (202) et travaille en arrière-plan ;
 *  3. consultation de la demande toutes les 1,5 à 2,5 s par de petites requêtes, jusqu'à la fin (2 min 30 au plus).
 * Ne lève jamais : renvoie toujours un message affichable.
 */
export async function callGenerate(body: unknown, deps: GenerateDeps = {}): Promise<GenerateResult> {
  const doFetch = deps.fetchImpl ?? fetch;
  const poll = deps.poll ?? defaultPoll;
  const sleep = deps.sleep ?? wait;
  const now = deps.now ?? Date.now;
  const id = (deps.newId ?? (() => crypto.randomUUID()))();
  const payload = JSON.stringify({ ...(body as object), request_id: id });
  const started = now();

  const finish = (outcome: Outcome): GenerateResult => {
    if (outcome?.ok) {
      notifyProgress();
      return { ok: true, data: outcome.data };
    }
    return { ok: false, error: outcome?.error ?? "La génération a échoué. Réessayez." };
  };

  // 1. Envoi (avec nouveaux essais en cas de coupure ou d'erreur de passerelle).
  let res: Response | null = null;
  for (let attempt = 0; attempt < SUBMIT_ATTEMPTS; attempt++) {
    try {
      res = await doFetch("/api/generate", { method: "POST", headers: { "Content-Type": "application/json" }, body: payload });
      if (![502, 503, 504].includes(res.status)) break;
    } catch {
      res = null;
    }
    if (attempt < SUBMIT_ATTEMPTS - 1) await sleep(700 * (attempt + 1));
  }
  if (!res) return { ok: false, error: "Connexion impossible. Vérifiez votre réseau et réessayez.", network: true };

  const json = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; job?: { status?: string } } | null;
  if (!json?.ok || !json.job) return { ok: false, error: json?.error ?? "La génération a échoué. Réessayez." };

  // 2-3. Consultation de la demande jusqu'à sa fin.
  for (let poll_i = 0; now() - started < DEADLINE_MS; poll_i++) {
    await sleep(poll_i === 0 ? 1500 : 2500);
    let job: JobSnapshot = null;
    try {
      job = await poll(id);
    } catch {
      /* coupure passagère : on réessaie au tour suivant */
    }
    if (job && job.status !== "running") return finish(job.result as Outcome);
  }
  return { ok: false, error: SLOW_MESSAGE, network: true };
}
