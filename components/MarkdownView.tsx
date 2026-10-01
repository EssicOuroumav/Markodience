import { parseMarkdown, type Inline } from "@/lib/rules";

const renderInline = (parts: Inline[]) =>
  parts.map((p, i) =>
    p.bold ? <strong key={i}>{p.text}</strong> : p.italic ? <em key={i}>{p.text}</em> : <span key={i}>{p.text}</span>,
  );

/** Aperçu markdown en composants React (aucune injection HTML). */
export default function MarkdownView({ source }: { source: string }) {
  return (
    <div className="space-y-2">
      {parseMarkdown(source).map((b, i) =>
        b.type === "p" ? (
          <p key={i}>{renderInline(b.inline)}</p>
        ) : (
          <ul key={i} className="list-disc space-y-1 pl-6">
            {b.items.map((it, j) => (<li key={j}>{renderInline(it)}</li>))}
          </ul>
        ),
      )}
    </div>
  );
}
