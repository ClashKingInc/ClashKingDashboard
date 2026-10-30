import type { ComponentType } from "react";
import {
  Ban,
  ChartNoAxesCombined,
  Bell,
  ClipboardList,
  Gift,
  LayoutDashboard,
  Link2,
  Map,
  ScrollText,
  Settings,
  ShieldCheck,
  TicketIcon,
  Trophy,
  Users,
} from "lucide-react";
import type { DashboardCapabilities, DashboardSection } from "@/lib/api/types/dashboard-access";

export interface DashboardNavigationItem {
  nameKey: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
  capability?: DashboardSection;
  fullAccess?: boolean;
  desktopOnly?: boolean;
  disabledInProduction?: boolean;
}

export interface DashboardNavigationSection {
  titleKey: string | null;
  items: DashboardNavigationItem[];
}

export const dashboardNavigationSections: DashboardNavigationSection[] = [
  {
    titleKey: null,
    items: [
      { nameKey: "general.name", path: "general", icon: Settings, capability: "settings" },
      { nameKey: "logs.name", path: "logs", icon: ScrollText, capability: "logs" },
      { nameKey: "roles.name", path: "roles", icon: ShieldCheck, capability: "roles" },
      { nameKey: "reminders.name", path: "reminders", icon: Bell, capability: "reminders" },
      { nameKey: "autoboards.name", path: "autoboards", icon: LayoutDashboard, capability: "autoboards" },
    ],
  },
  {
    titleKey: "sections.management",
    items: [
      { nameKey: "clans.name", path: "clans", icon: Users, capability: "clans" },
      { nameKey: "analytics.name", path: "analytics", icon: ChartNoAxesCombined, capability: "clans" },
      { nameKey: "competitive.name", path: "competitive", icon: Trophy, capability: "competitive" },
      { nameKey: "rosters.name", path: "rosters", icon: ClipboardList, capability: "rosters" },
      { nameKey: "bases.name", path: "bases", icon: Map, fullAccess: true },
      { nameKey: "links.name", path: "links", icon: Link2, capability: "links" },
      { nameKey: "bans.name", path: "bans-and-strikes", icon: Ban, capability: "moderation" },
      { nameKey: "giveaways.name", path: "giveaways", icon: Gift, capability: "giveaways" },
      { nameKey: "tickets.name", path: "tickets", icon: TicketIcon, capability: "tickets" },
      // Embeds and Graphics are temporarily hidden from dashboard navigation.
    ],
  },
];

// Reuse the normal menu while keeping server-scoped sessions away from global
// personal/account APIs. Hiding a link supplements, never replaces, API checks.
export const serverScopedDashboardPaths = new Set([
  "general", "logs", "roles", "reminders", "autoboards", "clans", "analytics",
  "competitive",
  "links", "bans-and-strikes", "giveaways", "tickets",
]);

export function firstViewableDashboardPath(capabilities: DashboardCapabilities): string | undefined {
  if (capabilities.full_access) return "general";
  for (const section of dashboardNavigationSections) {
    for (const item of section.items) {
      if (import.meta.env.PROD && item.disabledInProduction) continue;
      if (item.fullAccess ? capabilities.full_access : item.capability && capabilities.sections[item.capability]) {
        return item.path;
      }
    }
  }
  return capabilities.sections.panels ? "panels" : undefined;
}
