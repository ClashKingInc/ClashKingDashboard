"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink } from "lucide-react";

interface ClanProfilePopoverProps {
  clanName: string;
  clanTag: string;
  clanBadgeUrl?: string | null;
  children?: ReactNode;
  triggerClassName?: string;
  showTagInTrigger?: boolean;
}

export function getClashClanProfileUrl(clanTag: string): string {
  const cleanTag = clanTag.replace(/^#/, "");
  return `https://link.clashofclans.com/en/?action=OpenClanProfile&tag=%23${encodeURIComponent(cleanTag)}`;
}

export function ClanProfilePopover({
  clanName,
  clanTag,
  clanBadgeUrl,
  children,
  triggerClassName = "text-left cursor-pointer hover:opacity-80 transition-opacity",
  showTagInTrigger = true,
}: Readonly<ClanProfilePopoverProps>) {
  const tCommon = useTranslations("Common");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName}>
          {children ?? (
            <>
              <div className="font-medium text-foreground">{clanName}</div>
              {showTagInTrigger && (
                <div className="text-xs text-muted-foreground">{clanTag}</div>
              )}
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 shrink-0">
              <AvatarImage src={clanBadgeUrl ?? undefined} alt={clanName} />
              <AvatarFallback>{(clanName?.[0] || "?").toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-medium text-foreground truncate">{clanName}</p>
              <p className="text-xs text-muted-foreground">{clanTag}</p>
            </div>
          </div>
          <Button asChild variant="outline" className="w-full gap-2">
            <a
              href={getClashClanProfileUrl(clanTag)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              {tCommon("openInGame")}
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
