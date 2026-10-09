/**
 * Garde la connexion vivante pendant une génération longue (10 à 40 secondes) : certains réseaux ou intermédiaires
 * coupent une requête silencieuse au bout de ~20 s, le serveur terminait alors son travail sans que le navigateur
 * ne reçoive la réponse.
 *
 *  - Réponse rapide (avant `graceMs`) : renvoyée telle quelle, statut compris (404, 403, 409…).
 *  - Sinon : réponse 200 en flux qui envoie un espace IMMÉDIATEMENT (les en-têtes ne partent qu'avec le premier octet : sans cela
 *    le navigateur reste ~10 s sans rien recevoir), puis un espace toutes les `intervalMs` (ignoré par JSON.parse), puis le corps JSON
 *    de la réponse finale. Le statut d'erreur est alors perdu : les clients lisent `ok` et `error` dans le corps.
 */
export async function withHeartbeat(work: Promise<Response>, { graceMs = 1500, intervalMs = 3000 }: { graceMs?: number; intervalMs?: number } = {}): Promise<Response> {
  let graceTimer: ReturnType<typeof setTimeout> | undefined;
  const quick = await Promise.race([
    work.then((r) => r, () => null),
    new Promise<"slow">((resolve) => { graceTimer = setTimeout(() => resolve("slow"), graceMs); }),
  ]);
  clearTimeout(graceTimer);
  if (quick && quick !== "slow") return quick;

  const enc = new TextEncoder();
  let beat: ReturnType<typeof setInterval> | undefined;
  const failure = JSON.stringify({ ok: false, code: "unknown", error: "La génération a échoué. Réessayez." });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(enc.encode(" "));
      beat = setInterval(() => controller.enqueue(enc.encode(" ")), intervalMs);
      work.then(
        async (res) => {
          clearInterval(beat);
          controller.enqueue(enc.encode(await res.text()));
          controller.close();
        },
        () => {
          clearInterval(beat);
          controller.enqueue(enc.encode(failure));
          controller.close();
        },
      );
    },
    cancel() {
      clearInterval(beat);
    },
  });
  return new Response(stream, { status: 200, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store, no-transform", "X-Accel-Buffering": "no" } });
}
