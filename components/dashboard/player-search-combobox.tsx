"use client";

import { useState, useCallback } from "react";
import { Check, ChevronsUpDown, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

interface Player {
  tag: string;
  name: string;
  clan_name?: string;
  townhall?: number;
}

interface PlayerSearchComboboxProps {
  readonly guildId: string;
  readonly value: string;        // selected player tag
  readonly onChange: (tag: string, name: string) => void;
  readonly onClear: () => void;
  readonly placeholder: string;
  readonly selectedName?: string;
}

export function PlayerSearchCombobox({
  guildId,
  value,
  onChange,
  onClear,
  placeholder,
  selectedName,
}: PlayerSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const loadPlayers = useCallback(async () => {
    if (loaded) return;
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const res = await fetch(`/api/v2/roster/server/${guildId}/members`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data.members ?? []);
        setPlayers(list);
        setLoaded(true);
      }
    } catch {
      // silently fail — popover just shows empty
    } finally {
      setLoading(false);
    }
  }, [guildId, loaded]);

  return (
    <div className="flex gap-1">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="flex-1 justify-between font-normal truncate"
            onClick={loadPlayers}
          >
            <span className="truncate">
              {value ? (selectedName || value) : placeholder}
            </span>
            {loading ? (
              <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-50" />
            ) : (
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandList>
              {loading && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loading && <CommandEmpty>No player found.</CommandEmpty>}
              <CommandGroup>
                {players.slice(0, 50).map((player) => (
                  <CommandItem
                    key={player.tag}
                    value={`${player.name} ${player.tag} ${player.clan_name ?? ""}`}
                    onSelect={() => {
                      onChange(player.tag, player.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === player.tag ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{player.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {player.tag}{player.clan_name ? ` · ${player.clan_name}` : ""}
                      </div>
                    </div>
                    {player.townhall && (
                      <span className="ml-2 text-xs text-muted-foreground shrink-0">
                        TH{player.townhall}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 h-10 w-10 text-muted-foreground hover:text-foreground"
          onClick={onClear}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
