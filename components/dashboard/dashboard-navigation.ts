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
  beta?: boolean;
  serverScoped?: boolean;
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
      { nameKey: "general.name", path: "general", icon: Settings, capability: "settings", serverScoped: true },
      { nameKey: "logs.name", path: "logs", icon: ScrollText, capability: "logs", serverScoped: true },
      { nameKey: "roles.name", path: "roles", icon: ShieldCheck, capability: "roles", serverScoped: true },
      { nameKey: "reminders.name", path: "reminders", icon: Bell, capability: "reminders", serverScoped: true },
      { nameKey: "autoboards.name", path: "autoboards", icon: LayoutDashboard, capability: "autoboards", beta: true, serverScoped: true },
    ],
  },
  {
    titleKey: "sections.management",
    items: [
      { nameKey: "clans.name", path: "clans", icon: Users, capability: "clans", serverScoped: true },
      { nameKey: "analytics.name", path: "analytics", icon: ChartNoAxesCombined, capability: "clans", beta: true, serverScoped: true },
      { nameKey: "rosters.name", path: "rosters", icon: ClipboardList, capability: "rosters", serverScoped: true },
      { nameKey: "bases.name", path: "bases", icon: Map, fullAccess: true, serverScoped: true },
      { nameKey: "links.name", path: "links", icon: Link2, capability: "links", serverScoped: true },
      { nameKey: "bans.name", path: "bans-and-strikes", icon: Ban, capability: "moderation", serverScoped: true },
      { nameKey: "giveaways.name", path: "giveaways", icon: Gift, capability: "giveaways", serverScoped: true },
      { nameKey: "tickets.name", path: "tickets", icon: TicketIcon, capability: "tickets", serverScoped: true },
      // Embeds and Graphics are temporarily hidden from dashboard navigation.
    ],
  },
];

// Reuse the normal menu while keeping server-scoped sessions away from global
// personal/account APIs. Hiding a link supplements, never replaces, API checks.
export const serverScopedDashboardPaths = new Set(
  dashboardNavigationSections.flatMap(section => section.items.filter(item => item.serverScoped).map(item => item.path)),
);

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
