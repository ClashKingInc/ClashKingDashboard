"use client";

import { type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface DiscordOpenPopoverProps {
  trigger: ReactNode;
  title: string;
  description?: string;
  url: string;
  buttonLabel: string;
}

export function DiscordOpenPopover({
  trigger,
  title,
  description,
  url,
  buttonLabel,
}: Readonly<DiscordOpenPopoverProps>) {
  const openDiscord = () => window.open(url, "_blank", "noreferrer");

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-72 p-3" align="start">
        <div className="space-y-3">
          <div>
            <p className="truncate text-sm font-medium text-foreground">{title}</p>
            {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
          </div>
          <Button variant="outline" className="w-full gap-2" onClick={openDiscord}>
            <ExternalLink className="h-4 w-4" />
            {buttonLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}