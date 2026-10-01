/** Extrait un objet JSON d'une réponse de modèle, même si elle est entourée de ``` ou de texte. */
export function extractJson(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) throw new Error("no_json");
  return JSON.parse(text.slice(start, end + 1));
}
