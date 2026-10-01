import { BarChart3, CalendarDays, Fingerprint, LayoutGrid, ListChecks, MessageCircleHeart, Radio, ScanSearch, type LucideIcon } from "lucide-react";
import type { TabSlug } from "./tabs";
import type { IllustrationName } from "@/components/illustrations";

export const TAB_ICONS: Record<TabSlug, LucideIcon> = {
  identity: Fingerprint,
  audit: ScanSearch,
  pillars: LayoutGrid,
  tone: MessageCircleHeart,
  editorial: CalendarDays,
  kpi: BarChart3,
  rules: ListChecks,
  lives: Radio,
};

export const TAB_ILLUSTRATIONS: Record<TabSlug, IllustrationName> = {
  identity: "identity",
  audit: "audit",
  pillars: "pillars",
  tone: "chat",
  editorial: "calendar",
  kpi: "chart",
  rules: "rules",
  lives: "live",
};
