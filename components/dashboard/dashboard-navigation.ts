import type { ComponentType } from "react";
import {
  Ban,
  Bell,
  ClipboardList,
  FileText,
  Gift,
  LayoutDashboard,
  Link2,
  Map,
  Paintbrush,
  ScrollText,
  Settings,
  ShieldCheck,
  TicketIcon,
  UserCog,
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
      { nameKey: "familySettings.name", path: "family-settings", icon: UserCog, capability: "family_settings" },
      { nameKey: "logs.name", path: "logs", icon: ScrollText, capability: "logs" },
      { nameKey: "roles.name", path: "roles", icon: ShieldCheck, capability: "roles" },
      { nameKey: "reminders.name", path: "reminders", icon: Bell, capability: "reminders" },
      { nameKey: "autoboards.name", path: "autoboards", icon: LayoutDashboard, capability: "autoboards" },
    ],
  },
  {
    titleKey: "sections.clanManagement",
    items: [
      { nameKey: "clans.name", path: "clans", icon: Users, capability: "clans" },
      { nameKey: "rosters.name", path: "rosters", icon: ClipboardList, capability: "rosters" },
      { nameKey: "bases.name", path: "bases", icon: Map, fullAccess: true },
    ],
  },
  {
    titleKey: "sections.playerManagement",
    items: [
      { nameKey: "links.name", path: "links", icon: Link2, capability: "links" },
      { nameKey: "bans.name", path: "bans-and-strikes", icon: Ban, capability: "moderation" },
    ],
  },
  {
    titleKey: "sections.serverManagement",
    items: [
      { nameKey: "giveaways.name", path: "giveaways", icon: Gift, capability: "giveaways" },
      { nameKey: "tickets.name", path: "tickets", icon: TicketIcon, capability: "tickets" },
      { nameKey: "embeds.name", path: "embeds", icon: FileText, capability: "embeds" },
      { nameKey: "graphics.name", path: "graphics", icon: Paintbrush, capability: "embeds", desktopOnly: true },
    ],
  },
];

export function firstViewableDashboardPath(capabilities: DashboardCapabilities): string | undefined {
  if (capabilities.full_access) return "general";
  for (const section of dashboardNavigationSections) {
    for (const item of section.items) {
      if (item.fullAccess ? capabilities.full_access : item.capability && capabilities.sections[item.capability]) {
        return item.path;
      }
    }
  }
  return capabilities.sections.panels ? "panels" : undefined;
}
