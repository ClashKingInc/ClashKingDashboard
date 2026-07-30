"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import type { GuildInfo } from "@/lib/api/types/server";

interface MobileServerDropdownProps {
  readonly locale: string;
  readonly guildId: string;
  readonly guildName: string;
  readonly guildIcon?: string;
  readonly availableGuilds?: GuildInfo[];
  readonly isLoading?: boolean;
}

export function MobileServerDropdown({
  locale,
  guildId,
  guildName,
  guildIcon,
  availableGuilds = [],
  isLoading = false,
}: MobileServerDropdownProps) {
  const router = useRouter();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const selectGuild = (guild: GuildInfo) => {
    const icon = guild.icon?.startsWith("https") ? guild.icon : undefined;
    sessionStorage.setItem("selected_guild", JSON.stringify({
      id: guild.id,
      name: guild.name,
      icon,
    }));
    setIsDropdownOpen(false);
    router.push(`/${locale}/dashboard/${guild.id}`);
  };

  if (isLoading) {
    return (
      <div className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1">
        <Skeleton className="h-8 w-8 rounded-md" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-4" />
      </div>
    );
  }

  return (
    <DropdownMenu open={isDropdownOpen} onOpenChange={setIsDropdownOpen}>
      <DropdownMenuTrigger asChild>
        <button className="flex min-w-0 items-center gap-2 rounded-xl px-1 py-1 text-left outline-none transition-colors hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring">
          <Avatar className="h-8 w-8 rounded-lg border border-border">
            <AvatarImage src={guildIcon} className="rounded-lg" />
            <AvatarFallback className="rounded-lg bg-secondary text-sm font-bold text-primary">
              {guildName.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-semibold text-foreground">{guildName}</span>
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
              isDropdownOpen && "rotate-180"
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        {(availableGuilds.length > 0 ? availableGuilds : [{
          id: guildId,
          name: guildName,
          icon: guildIcon ?? null,
          has_bot: true,
        } as GuildInfo]).map((guild) => (
          <DropdownMenuItem
            key={guild.id}
            onSelect={() => selectGuild(guild)}
            className="flex cursor-pointer items-center gap-2.5 rounded-lg py-2"
          >
            <Avatar className="h-8 w-8 rounded-lg border border-border">
              <AvatarImage src={guild.icon?.startsWith("https") ? guild.icon : undefined} className="rounded-lg" />
              <AvatarFallback className="rounded-lg bg-secondary text-sm font-semibold text-primary">
                {guild.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate font-medium">{guild.name}</span>
            {guild.id === guildId && <Check className="h-4 w-4 shrink-0 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
