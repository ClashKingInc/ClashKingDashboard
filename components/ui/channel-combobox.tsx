"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
  channels: Channel[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showDisabled?: boolean
}

export function ChannelCombobox({
  channels,
  value,
  onValueChange,
  placeholder = "Select channel",
  disabled = false,
  className,
  showDisabled = true,
}: ChannelComboboxProps) {
  const [open, setOpen] = React.useState(false)

  const selectedChannel = channels.find((channel) => channel.id === value)

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
          {selectedChannel ? (
            <span className="truncate">#{selectedChannel.name}</span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search channels..." />
          <CommandList>
            <CommandEmpty>No channel found.</CommandEmpty>
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
                  Disabled
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
                      value === channel.id ? "opacity-100" : "opacity-0"
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
