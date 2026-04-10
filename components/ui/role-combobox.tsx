"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
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

interface Role {
  id: string
  name: string
  color?: number
}

interface RoleComboboxProps {
  readonly roles: Role[]
  readonly value?: string
  readonly onValueChange?: (value: string) => void
  readonly onAdd?: (roleId: string) => void
  readonly excludeRoleIds?: string[]
  readonly placeholder?: string
  readonly addPlaceholder?: string
  readonly disabled?: boolean
  readonly className?: string
  readonly showDisabled?: boolean
  readonly mode?: "select" | "add"
}

function intToHexColor(color: number): string {
  if (!color) return "#99AAB5" // Discord default gray
  return `#${color.toString(16).padStart(6, "0")}`
}

export function RoleCombobox({
  roles,
  value,
  onValueChange,
  onAdd,
  excludeRoleIds = [],
  placeholder = "Select role",
  addPlaceholder,
  disabled = false,
  className,
  showDisabled = true,
  mode = "select",
}: RoleComboboxProps) {
  const t = useTranslations("Common")
  const [open, setOpen] = React.useState(false)

  const selectedRole = roles.find((role) => role.id === value)

  // Filter out excluded roles in add mode
  const availableRoles = mode === "add"
    ? roles.filter((role) => !excludeRoleIds.includes(role.id))
    : roles

  const isAddMode = mode === "add"
  const hasNoAvailableRoles = isAddMode && availableRoles.length === 0

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-background border-border text-foreground hover:bg-accent hover:text-accent-foreground",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled || hasNoAvailableRoles}
        >
          {isAddMode ? (
            <span className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              {addPlaceholder || t("addRole")}
            </span>
          ) : selectedRole ? ( // NOSONAR — JSX nested ternary for multi-branch display state
            <span className="flex items-center gap-2 truncate">
              <span
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: intToHexColor(selectedRole.color || 0) }}
              />
              <span className="truncate">@{selectedRole.name}</span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("searchRoles")} />
          <CommandList>
            <CommandEmpty className="py-3">
              {t("noRoleFound")}
            </CommandEmpty>
            <CommandGroup>
              {showDisabled && !isAddMode && (
                <CommandItem
                  value="disabled"
                  onSelect={() => {
                    onValueChange?.("disabled")
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
              {availableRoles.map((role) => (
                <CommandItem
                  key={role.id}
                  value={role.name}
                  onSelect={() => {
                    if (isAddMode) {
                      onAdd?.(role.id)
                    } else {
                      onValueChange?.(role.id)
                    }
                    setOpen(false)
                  }}
                >
                  {!isAddMode && (
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === role.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  )}
                  <span
                    className="w-3 h-3 rounded-full mr-2 shrink-0"
                    style={{ backgroundColor: intToHexColor(role.color || 0) }}
                  />
                  <span className="truncate">@{role.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
