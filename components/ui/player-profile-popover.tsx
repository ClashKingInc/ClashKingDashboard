"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink } from "lucide-react";

interface PlayerProfilePopoverProps {
  playerName: string;
  playerTag: string;
  clanName?: string | null;
  townhallLevel?: number | null;
  trophies?: number | null;
  warPreference?: boolean | null;
  signupGroup?: string | null;
  heroLevels?: number | null;
  hitrate?: number | null;
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
  clanName,
  townhallLevel,
  trophies,
  warPreference,
  signupGroup,
  heroLevels,
  hitrate,
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
          {(clanName !== undefined || townhallLevel !== undefined || trophies !== undefined || warPreference !== undefined || signupGroup !== undefined || heroLevels !== undefined || hitrate !== undefined) && (
            <div className="space-y-1.5 text-xs">
              {clanName !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Clan</span>
                  <span className="text-foreground truncate">{clanName || "-"}</span>
                </div>
              )}
              {townhallLevel !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Stadhuis niveau</span>
                  <span className="text-foreground">{townhallLevel == null ? "-" : `TH${townhallLevel}`}</span>
                </div>
              )}
              {trophies !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Trofeeen</span>
                  <span className="text-foreground">{trophies == null ? "-" : trophies.toLocaleString()}</span>
                </div>
              )}
              {warPreference !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Oorlogsvoorkeur</span>
                  <span className="text-foreground">{warPreference == null ? "-" : warPreference ? "In" : "Out"}</span>
                </div>
              )}
              {signupGroup !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Aanmeldingsgroep</span>
                  <span className="text-foreground">{signupGroup || "-"}</span>
                </div>
              )}
              {heroLevels !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">Heldenniveaus</span>
                  <span className="text-foreground">{heroLevels == null ? "-" : heroLevels}</span>
                </div>
              )}
              {hitrate !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">30 dagen trefferscore</span>
                  <span className="text-foreground">
                    {hitrate == null ? "-" : `${new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2 }).format(hitrate)}%`}
                  </span>
                </div>
              )}
            </div>
          )}
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
