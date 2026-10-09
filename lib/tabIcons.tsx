import { BarChart3, CalendarDays, CalendarCheck, Fingerprint, LayoutGrid, Palette, ListChecks, MessageCircleHeart, Radio, ScanSearch, type LucideIcon } from "lucide-react";
import type { TabSlug } from "./tabs";
import type { IllustrationName } from "@/components/illustrations";

export const TAB_ICONS: Record<TabSlug, LucideIcon> = {
  identity: Fingerprint,
  charter: Palette,
  audit: ScanSearch,
  pillars: LayoutGrid,
  tone: MessageCircleHeart,
  editorial: CalendarDays,
  posts: CalendarCheck,
  kpi: BarChart3,
  rules: ListChecks,
  lives: Radio,
};

export const TAB_ILLUSTRATIONS: Record<TabSlug, IllustrationName> = {
  identity: "identity",
  charter: "identity",
  audit: "audit",
  pillars: "pillars",
  tone: "chat",
  editorial: "calendar",
  posts: "calendar",
  kpi: "chart",
  rules: "rules",
  lives: "live",
};
