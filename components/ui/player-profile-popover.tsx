"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink } from "lucide-react";

interface PlayerProfilePopoverProps {
  playerName: string;
  playerTag: string;
  children?: ReactNode;
  triggerClassName?: string;
  showTagInTrigger?: boolean;
}

export function getClashProfileUrl(playerTag: string): string {
  const cleanTag = playerTag.replace(/^#/, "");
  return `https://link.clashofclans.com/en/?action=OpenPlayerProfile&tag=%23${encodeURIComponent(cleanTag)}`;
}

export function PlayerProfilePopover({
  playerName,
  playerTag,
  children,
  triggerClassName = "text-left cursor-pointer hover:opacity-80 transition-opacity",
  showTagInTrigger = true,
}: PlayerProfilePopoverProps) {
  const tCommon = useTranslations("Common");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className={triggerClassName}>
          {children ?? (
            <>
              <div className="font-medium text-foreground">{playerName}</div>
              {showTagInTrigger && (
                <div className="text-xs text-muted-foreground">{playerTag}</div>
              )}
            </>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="space-y-3">
          <div>
            <p className="font-medium text-foreground truncate">{playerName}</p>
            <p className="text-xs text-muted-foreground">{playerTag}</p>
          </div>
          <Button asChild variant="outline" className="w-full gap-2">
            <a
              href={getClashProfileUrl(playerTag)}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              {tCommon("viewClashProfile")}
            </a>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
