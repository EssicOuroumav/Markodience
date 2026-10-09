import { BarChart3, CalendarDays, CalendarCheck, FolderOpen, Fingerprint, LayoutGrid, Palette, Sprout, Wand2, ListChecks, MessageCircleHeart, Radio, ScanSearch, type LucideIcon } from "lucide-react";
import type { TabSlug } from "./tabs";
import type { IllustrationName } from "@/components/illustrations";

export const TAB_ICONS: Record<TabSlug, LucideIcon> = {
  plan: Wand2,
  identity: Fingerprint,
  charter: Palette,
  audit: ScanSearch,
  pillars: LayoutGrid,
  tone: MessageCircleHeart,
  editorial: CalendarDays,
  posts: CalendarCheck,
  library: FolderOpen,
  organic: Sprout,
  kpi: BarChart3,
  rules: ListChecks,
  lives: Radio,
};

export const TAB_ILLUSTRATIONS: Record<TabSlug, IllustrationName> = {
  plan: "start",
  identity: "identity",
  charter: "identity",
  audit: "audit",
  pillars: "pillars",
  tone: "chat",
  editorial: "calendar",
  posts: "calendar",
  library: "start",
  organic: "start",
  kpi: "chart",
  rules: "rules",
  lives: "live",
};
