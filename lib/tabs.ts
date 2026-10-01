export const TABS = [
  { slug: "identity", label: "Identité de marque", ready: true },
  { slug: "audit", label: "Audit", ready: false },
  { slug: "pillars", label: "Piliers de contenu", ready: true },
  { slug: "tone", label: "Tonalité & voix", ready: true },
  { slug: "editorial", label: "Ligne éditoriale", ready: false },
  { slug: "kpi", label: "KPIs & Reporting", ready: false },
  { slug: "rules", label: "Règles opérationnelles", ready: false },
] as const;

export type TabSlug = (typeof TABS)[number]["slug"];
