import { BarChart3, CalendarDays, CalendarCheck, FolderOpen, Fingerprint, Lightbulb, LayoutGrid, Palette, Sprout, Users, Wand2, ListChecks, MessageCircleHeart, Radio, ScanSearch, MessagesSquare, type LucideIcon } from "lucide-react";
import type { TabSlug } from "./tabs";
import type { IllustrationName } from "@/components/illustrations";

export const TAB_ICONS: Record<TabSlug, LucideIcon> = {
  plan: Wand2,
  identity: Fingerprint,
  charter: Palette,
  personas: Users,
  ideas: Lightbulb,
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
  community: MessagesSquare,
};

export const TAB_ILLUSTRATIONS: Record<TabSlug, IllustrationName> = {
  plan: "start",
  identity: "identity",
  charter: "identity",
  personas: "identity",
  ideas: "start",
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
  community: "chat",
};
