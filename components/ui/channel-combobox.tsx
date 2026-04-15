"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface Channel {
  id: string
  name: string
  parent_name?: string
}

interface ChannelComboboxProps {
  readonly channels: Channel[]
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly placeholder?: string
  readonly searchPlaceholder?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly showDisabled?: boolean
}

export function ChannelCombobox({
  channels,
  value,
  onValueChange,
  placeholder = "Select channel",
  searchPlaceholder,
  disabled = false,
  className,
  showDisabled = true,
}: ChannelComboboxProps) {
  const t = useTranslations("Common")
  const [open, setOpen] = React.useState(false)

  const selectedChannel = channels.find((channel) => String(channel.id) === String(value))
  const isDisabledValue = value === "disabled"
  let buttonLabel: React.ReactNode = placeholder
  if (selectedChannel) {
    buttonLabel = <span className="truncate">#{selectedChannel.name}</span>
  } else if (isDisabledValue) {
    buttonLabel = t("disabled") || "Disabled"
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-secondary border-border",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {buttonLabel}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t("searchChannels")} />
          <CommandList>
            <CommandEmpty className="py-3">
              {t("noChannelFound")}
            </CommandEmpty>
            <CommandGroup>
              {showDisabled && (
                <CommandItem
                  value="disabled"
                  onSelect={() => {
                    onValueChange("disabled")
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === "disabled" ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {t("disabled") || "Disabled"}
                </CommandItem>
              )}
              {channels.map((channel) => (
                <CommandItem
                  key={channel.id}
                  value={`${channel.name} ${channel.parent_name || ""}`}
                  onSelect={() => {
                    onValueChange(channel.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      String(value) === String(channel.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>#{channel.name}</span>
                    {channel.parent_name && (
                      <span className="text-xs text-muted-foreground">
                        {channel.parent_name}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
