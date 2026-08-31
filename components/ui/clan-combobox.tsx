"use client"

import * as React from "react"
import Image from "next/image"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { clanBadgeUrl } from "@/lib/clash-asset-urls"

interface ClanOption {
  readonly tag: string
  readonly name: string
}

interface ClanSpecialOption {
  readonly value: string
  readonly label: string
  readonly description?: string
  readonly imageUrl?: string | null
  readonly fallback?: string
}

interface ClanComboboxProps {
  readonly clans: readonly ClanOption[]
  readonly value?: string
  readonly onValueChange: (value: string) => void
  readonly placeholder: string
  readonly searchPlaceholder?: string
  readonly emptyText?: string
  readonly specialOptions?: readonly ClanSpecialOption[]
  readonly className?: string
  readonly id?: string
  readonly disabled?: boolean
}

export function ClanCombobox({
  clans,
  value = "",
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  specialOptions = [],
  className,
  id,
  disabled = false,
}: ClanComboboxProps) {
  const t = useTranslations("Common")
  const [open, setOpen] = React.useState(false)
  const selectedClan = clans.find((clan) => clan.tag === value)
  const selectedSpecial = specialOptions.find((option) => option.value === value)

  let selectedLabel = placeholder
  if (selectedSpecial) selectedLabel = selectedSpecial.label
  else if (value && !selectedClan) selectedLabel = value

  const selectValue = (nextValue: string) => {
    onValueChange(nextValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-12 w-full justify-between bg-background px-2.5 font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          {selectedClan ? (
            <span className="flex min-w-0 items-center gap-2.5 text-left">
              <Image
                src={clanBadgeUrl(selectedClan.tag)}
                alt=""
                width={32}
                height={32}
                unoptimized
                className="h-8 w-8 shrink-0 object-contain"
              />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium text-foreground">{selectedClan.name}</span>
                <span className="block truncate font-mono text-[10px] text-muted-foreground">{selectedClan.tag}</span>
              </span>
            </span>
          ) : selectedSpecial ? (
            <span className="flex min-w-0 items-center gap-2.5 text-left">
              <Avatar className="h-8 w-8 rounded-xl">
                <AvatarImage src={selectedSpecial.imageUrl ?? undefined} className="rounded-xl" />
                <AvatarFallback className="rounded-xl text-xs font-semibold">
                  {selectedSpecial.fallback ?? selectedSpecial.label.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium text-foreground">{selectedSpecial.label}</span>
                {selectedSpecial.description && (
                  <span className="block truncate text-[10px] text-muted-foreground">{selectedSpecial.description}</span>
                )}
              </span>
            </span>
          ) : (
            <span className="truncate">{selectedLabel}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        variant="combobox"
        align="start"
        style={{ maxHeight: "min(24rem, calc(100dvh - 2rem))" }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t("searchClans")} />
          <CommandList className="scrollbar-custom overscroll-contain" style={{ maxHeight: "min(18rem, calc(100dvh - 6rem))" }}>
            <CommandEmpty>{emptyText ?? t("noClanFound")}</CommandEmpty>
            {specialOptions.length > 0 && (
              <>
                <CommandGroup>
                  {specialOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => selectValue(option.value)}
                      className="min-h-12 gap-2.5 px-2.5 py-2"
                    >
                      <Avatar className="h-[34px] w-[34px] rounded-xl">
                        <AvatarImage src={option.imageUrl ?? undefined} className="rounded-xl" />
                        <AvatarFallback className="rounded-xl text-xs font-semibold">
                          {option.fallback ?? option.label.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block truncate text-sm font-medium">{option.label}</span>
                        {option.description && (
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{option.description}</span>
                        )}
                      </span>
                      <Check className={cn("h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}
            <CommandGroup>
              {clans.map((clan) => (
                <CommandItem
                  key={clan.tag}
                  value={`${clan.name} ${clan.tag}`}
                  onSelect={() => selectValue(clan.tag)}
                  className="min-h-12 gap-2.5 px-2.5 py-2"
                >
                  <Image
                    src={clanBadgeUrl(clan.tag)}
                    alt=""
                    width={34}
                    height={34}
                    unoptimized
                    className="h-[34px] w-[34px] shrink-0 object-contain"
                  />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-sm font-medium">{clan.name}</span>
                    <span className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground">{clan.tag}</span>
                  </span>
                  <Check className={cn("h-4 w-4 shrink-0", value === clan.tag ? "opacity-100" : "opacity-0")} />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export type { ClanOption, ClanSpecialOption }
