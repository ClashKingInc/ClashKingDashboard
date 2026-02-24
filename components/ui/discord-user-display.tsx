"use client";

import React from "react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { User, ExternalLink, UserX, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DiscordUserDisplayProps {
  /** Discord user ID (required for profile link) */
  userId?: string | null;
  /** Username if available (user is on server) */
  username?: string | null;
  /** Avatar URL if available */
  avatarUrl?: string | null;
  /** Raw discord value (e.g., "<@123456>") - used to extract ID if userId not provided */
  rawDiscordValue?: string | null;
  /** Size variant */
  size?: "sm" | "md";
  /** Show popover on click */
  showPopover?: boolean;
  /** Additional class name */
  className?: string;
}

/**
 * Extracts Discord user ID from various formats
 * Supports: "<@123>", "<@!123>", "123", etc.
 */
function extractUserId(value: string | null | undefined): string | null {
  if (!value) return null;

  // Check for mention format <@123> or <@!123>
  const mentionMatch = value.match(/<@!?(\d+)>/);
  if (mentionMatch) {
    return mentionMatch[1];
  }

  // Check if it's just a numeric ID
  if (/^\d+$/.test(value)) {
    return value;
  }

  return null;
}

export function DiscordUserDisplay({
  userId,
  username,
  avatarUrl,
  rawDiscordValue,
  size = "sm",
  showPopover = true,
  className,
}: DiscordUserDisplayProps) {
  const t = useTranslations("DiscordUserDisplay");
  const [copied, setCopied] = React.useState(false);

  // Extract user ID from raw value if not provided directly
  const resolvedUserId = userId || extractUserId(rawDiscordValue);

  // Determine if user is on server (has username)
  const isOnServer = !!username;

  // If no user ID and no username, show placeholder
  if (!resolvedUserId && !username) {
    return <span className="text-muted-foreground">-</span>;
  }

  const avatarSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  const handleCopyId = async () => {
    if (resolvedUserId) {
      await navigator.clipboard.writeText(resolvedUserId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const openDiscordProfile = () => {
    if (resolvedUserId) {
      // Try Discord app first, fallback to web
      window.open(`https://discord.com/users/${resolvedUserId}`, "_blank");
    }
  };

  const displayContent = (
    <div
      className={cn(
        "flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity",
        className
      )}
    >
      <Avatar className={avatarSize}>
        {avatarUrl ? (
          <AvatarImage src={avatarUrl} alt={username || "Discord user"} />
        ) : null}
        <AvatarFallback
          className={cn(
            textSize,
            isOnServer
              ? "bg-blue-500/20 text-blue-400"
              : "bg-orange-500/20 text-orange-400"
          )}
        >
          {isOnServer ? (
            <User className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
          ) : (
            <UserX className={size === "sm" ? "h-3 w-3" : "h-4 w-4"} />
          )}
        </AvatarFallback>
      </Avatar>
      <span
        className={cn(
          textSize,
          "truncate max-w-[120px]",
          isOnServer ? "text-blue-400" : "text-orange-400 italic"
        )}
        title={
          username ||
          (resolvedUserId ? t("idPrefix", { id: resolvedUserId }) : undefined)
        }
      >
        {isOnServer ? username : t("unknownUserShort")}
      </span>
    </div>
  );

  if (!showPopover) {
    return displayContent;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{displayContent}</PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="flex flex-col gap-4">
          {/* Header with avatar and status */}
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              {avatarUrl ? (
                <AvatarImage src={avatarUrl} alt={username || "Discord user"} />
              ) : null}
              <AvatarFallback
                className={cn(
                  "text-lg",
                  isOnServer
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-orange-500/20 text-orange-400"
                )}
              >
                {isOnServer ? <User className="h-6 w-6" /> : <UserX className="h-6 w-6" />}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              {isOnServer ? (
                <>
                  <p className="font-medium text-foreground truncate">{username}</p>
                  <p className="text-xs text-green-500 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    {t("status.onServer")}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-muted-foreground">
                    {t("unknownUser")}
                  </p>
                  <p className="text-xs text-orange-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-orange-400" />
                    {t("status.notOnServer")}
                  </p>
                </>
              )}
            </div>
          </div>

          {/* User ID */}
          {resolvedUserId && (
            <div className="flex items-center justify-between bg-secondary/50 rounded-md px-3 py-2">
              <div>
                <p className="text-xs text-muted-foreground">{t("discordId")}</p>
                <p className="text-sm font-mono text-foreground">{resolvedUserId}</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleCopyId}
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          )}

          {/* Action button */}
          {resolvedUserId && (
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={openDiscordProfile}
            >
              <ExternalLink className="h-4 w-4" />
              {t("viewProfile")}
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
