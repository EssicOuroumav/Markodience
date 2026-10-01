export type SaveState = "idle" | "saving" | "saved" | "error";

export default function SaveIndicator({ state }: { state: SaveState }) {
  const text = { idle: "", saving: "Enregistrement…", saved: "Enregistré", error: "Échec de l'enregistrement" }[state];
  return (
    <span role="status" aria-live="polite" className={`caption ${state === "error" ? "!text-danger" : ""}`}>
      {text}
    </span>
  );
}
