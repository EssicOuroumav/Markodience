import { TABS, type TabSlug } from "@/lib/tabs";
import { TAB_ICONS } from "@/lib/tabIcons";

/** En-tête commun des onglets : pastille d'icône, titre, description et zone d'actions. */
export default function PageHeader({ tab, title, description, children }: { tab: TabSlug; title?: string; description?: string; children?: React.ReactNode }) {
  const t = TABS.find((x) => x.slug === tab)!;
  const Icon = TAB_ICONS[tab];
  return (
    <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
      <div className="flex items-start gap-4">
        <span aria-hidden className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent shadow-card">
          <Icon size={24} strokeWidth={1.8} />
        </span>
        <div>
          <h1 className="text-[32px] leading-tight">{title ?? t.label}</h1>
          <p className="mt-1 max-w-2xl text-[16px] text-ink-secondary">{description ?? t.description}</p>
        </div>
      </div>
      {children && <div className="flex items-center gap-3">{children}</div>}
    </div>
  );
}
