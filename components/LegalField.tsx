import { TODO_TEXT } from "@/lib/legal";

/** Valeur légale : affichée telle quelle, ou en surbrillance « À compléter » tant qu'elle n'est pas renseignée. */
export default function LegalField({ value }: { value: string | null | undefined }) {
  return value ? <>{value}</> : <mark className="rounded bg-warning/30 px-1.5 py-0.5 text-ink">{TODO_TEXT}</mark>;
}
