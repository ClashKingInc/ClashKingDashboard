"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { useTranslations } from "next-intl"

import { Button } from "@/components/ui/button"
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

interface ClanOption {
  readonly tag: string
  readonly name: string
}

interface ClanSpecialOption {
  readonly value: string
  readonly label: string
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
  if (selectedClan) selectedLabel = `${selectedClan.name} · ${selectedClan.tag}`
  else if (selectedSpecial) selectedLabel = selectedSpecial.label
  else if (value) selectedLabel = value

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
            "h-9 w-full justify-between bg-background px-3 font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[var(--radix-popover-trigger-width)] p-0"
        style={{ maxHeight: "min(24rem, calc(100dvh - 2rem))" }}
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder ?? t("searchClans")} />
          <CommandList className="overscroll-contain" style={{ maxHeight: "min(18rem, calc(100dvh - 6rem))" }}>
            <CommandEmpty>{emptyText ?? t("noClanFound")}</CommandEmpty>
            {specialOptions.length > 0 && (
              <>
                <CommandGroup>
                  {specialOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => selectValue(option.value)}
                    >
                      <Check className={cn("h-4 w-4 shrink-0", value === option.value ? "opacity-100" : "opacity-0")} />
                      <span className="truncate">{option.label}</span>
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
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === clan.tag ? "opacity-100" : "opacity-0")} />
                  <span className="min-w-0 flex-1 truncate">{clan.name}</span>
                  <span className="shrink-0 font-mono text-xs text-muted-foreground">{clan.tag}</span>
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
