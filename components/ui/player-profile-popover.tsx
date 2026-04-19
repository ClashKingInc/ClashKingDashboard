"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ExternalLink } from "lucide-react";

interface PlayerProfilePopoverProps {
  playerName: string;
  playerTag: string;
  clanName?: string | null;
  clanTag?: string | null;
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
  clanTag,
  townhallLevel,
  trophies,
  warPreference,
  signupGroup,
  heroLevels,
  hitrate,
  children,
  triggerClassName = "text-left cursor-pointer hover:opacity-80 transition-opacity",
  showTagInTrigger = true,
}: Readonly<PlayerProfilePopoverProps>) {
  const tCommon = useTranslations("Common");
  const locale = useLocale();
  const hasDetails =
    clanName !== undefined ||
    clanTag !== undefined ||
    townhallLevel !== undefined ||
    trophies !== undefined ||
    warPreference !== undefined ||
    signupGroup !== undefined ||
    heroLevels !== undefined ||
    hitrate !== undefined;

  let warPreferenceLabel = "-";
  if (warPreference === true) {
    warPreferenceLabel = tCommon("playerProfile.warPreferenceIn");
  } else if (warPreference === false) {
    warPreferenceLabel = tCommon("playerProfile.warPreferenceOut");
  }

  let clanLabel = clanName ?? clanTag ?? "-";
  if (clanName && clanTag && clanName !== clanTag) {
    clanLabel = `${clanName} (${clanTag})`;
  }

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
          {hasDetails && (
            <div className="space-y-1.5 text-xs">
              {(clanName !== undefined || clanTag !== undefined) && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{tCommon("playerProfile.clan")}</span>
                  <span className="text-foreground truncate">{clanLabel}</span>
                </div>
              )}
              {townhallLevel !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{tCommon("playerProfile.townHallLevel")}</span>
                  {townhallLevel == null ? (
                    <span className="text-foreground">-</span>
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <img
                        src={`https://assets.clashk.ing/home-base/town-hall-pics/town-hall-${townhallLevel}.png`}
                        alt={`TH${townhallLevel}`}
                        className="w-6 h-6 object-contain"
                      />
                      <span className="text-foreground">TH{townhallLevel}</span>
                    </div>
                  )}
                </div>
              )}
              {trophies !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{tCommon("playerProfile.trophies")}</span>
                  <span className="text-foreground">{trophies == null ? "-" : trophies.toLocaleString()}</span>
                </div>
              )}
              {warPreference !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{tCommon("playerProfile.warPreference")}</span>
                  <span className="text-foreground">{warPreferenceLabel}</span>
                </div>
              )}
              {signupGroup !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{tCommon("playerProfile.signupGroup")}</span>
                  <span className="text-foreground">{signupGroup ?? "-"}</span>
                </div>
              )}
              {heroLevels !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{tCommon("playerProfile.heroLevels")}</span>
                  <span className="text-foreground">{heroLevels ?? "-"}</span>
                </div>
              )}
              {hitrate !== undefined && (
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted-foreground">{tCommon("playerProfile.hitrate30d")}</span>
                  <span className="text-foreground">
                    {hitrate == null ? "-" : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(hitrate)}%`}
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
