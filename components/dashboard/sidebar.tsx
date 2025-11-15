"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  Settings,
  Users,
  FileText,
  Shield,
  Bell,
  AlertTriangle,
  Ticket,
  Wrench,
  Home,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  guildId: string;
  guildName: string;
  guildIcon?: string;
}

export function Sidebar({ guildId, guildName, guildIcon }: SidebarProps) {
  const pathname = usePathname();

  const navigation = [
    {
      name: "Overview",
      href: `/${guildId}`,
      icon: Home,
    },
    {
      name: "General",
      href: `/${guildId}/general`,
      icon: Settings,
    },
    {
      name: "Clans",
      href: `/${guildId}/clans`,
      icon: Users,
    },
    {
      name: "Logs",
      href: `/${guildId}/logs`,
      icon: FileText,
    },
    {
      name: "Roles",
      href: `/${guildId}/roles`,
      icon: Shield,
    },
    {
      name: "Permissions",
      href: `/${guildId}/permissions`,
      icon: Shield,
    },
    {
      name: "Reminders",
      href: `/${guildId}/reminders`,
      icon: Bell,
    },
    {
      name: "Strikes",
      href: `/${guildId}/strikes`,
      icon: AlertTriangle,
    },
    {
      name: "Tickets",
      href: `/${guildId}/tickets`,
      icon: Ticket,
    },
    {
      name: "Advanced",
      href: `/${guildId}/advanced`,
      icon: Wrench,
    },
  ];

  return (
    <div className="flex h-full w-64 flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
      {/* Server Header */}
      <div className="p-4">
        <Link href="/servers" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Avatar className="h-10 w-10">
            <AvatarImage src={guildIcon} />
            <AvatarFallback>{guildName.charAt(0)}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{guildName}</p>
            <p className="text-xs text-muted-foreground">Server Settings</p>
          </div>
        </Link>
      </div>

      <Separator />

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.name}
              </Link>
            );
          })}
        </div>
      </nav>

      <Separator />

      {/* User Info */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">User</p>
            <p className="text-xs text-muted-foreground">Settings</p>
          </div>
        </div>
      </div>
    </div>
  );
}
