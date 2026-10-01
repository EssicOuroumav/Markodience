import { ILLUSTRATIONS, type IllustrationName } from "./illustrations";

/** État vide illustré : jamais un écran sans message ni action. */
export default function EmptyState({ illustration = "start", title, text, children }: { illustration?: IllustrationName; title: string; text?: string; children?: React.ReactNode }) {
  const Art = ILLUSTRATIONS[illustration];
  return (
    <div className="card-flat flex flex-col items-center px-6 py-10 text-center">
      <Art className="w-52 max-w-full" />
      <h2 className="mt-4 text-[22px]">{title}</h2>
      {text && <p className="mt-2 max-w-md text-[16px] text-ink-secondary">{text}</p>}
      {children && <div className="mt-6 flex flex-wrap items-center justify-center gap-3">{children}</div>}
    </div>
  );
}
