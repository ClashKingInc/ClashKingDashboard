"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
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
  roles: Role[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  showDisabled?: boolean
}

function intToHexColor(color: number): string {
  if (!color) return "#99AAB5" // Discord default gray
  return `#${color.toString(16).padStart(6, "0")}`
}

export function RoleCombobox({
  roles,
  value,
  onValueChange,
  placeholder = "Select role",
  disabled = false,
  className,
  showDisabled = true,
}: RoleComboboxProps) {
  const t = useTranslations("Common")
  const [open, setOpen] = React.useState(false)

  const selectedRole = roles.find((role) => role.id === value)

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
          {selectedRole ? (
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
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder={t("searchRoles")} />
          <CommandList>
            <CommandEmpty className="py-3">
              {t("noRoleFound")}
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
              {roles.map((role) => (
                <CommandItem
                  key={role.id}
                  value={role.name}
                  onSelect={() => {
                    onValueChange(role.id)
                    setOpen(false)
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === role.id ? "opacity-100" : "opacity-0"
                    )}
                  />
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
