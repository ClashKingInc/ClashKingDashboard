"use client";

import { useState } from "react";
import { CalendarIcon } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function localDateValue(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Values remain local wall-clock strings; callers convert to UTC only on save. */
export function DateTimePicker({ value, onChange, type = "datetime-local", className, id, disabled, ...props }: {
  value: string; onChange: (event: { target: { value: string } }) => void;
  type?: "date" | "datetime-local"; className?: string; id?: string; disabled?: boolean;
  "aria-label"?: string;
}) {
  const [open, setOpen] = useState(false);
  const parsed = value ? new Date(`${value.slice(0, 10)}T12:00:00`) : undefined;
  const selected = parsed && Number.isFinite(parsed.getTime()) ? parsed : undefined;
  const time = value.slice(11, 16) || "12:00";
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return <div className={cn("min-w-0 space-y-1.5", className)}>
    <div className="flex min-w-0 items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button id={id} type="button" variant="secondary" disabled={disabled}
            aria-label={props["aria-label"]} className="h-10 min-w-0 flex-1 justify-start rounded-xl border-0 bg-muted/55 font-normal">
            <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
            <span className="truncate">{selected ? selected.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={selected} defaultMonth={selected} timeZone={zone}
            onSelect={date => { onChange({ target: { value: date ? `${localDateValue(date)}${type === "date" ? "" : `T${time}`}` : "" } }); setOpen(false); }} />
        </PopoverContent>
      </Popover>
      {type !== "date" && <div className="flex shrink-0 items-center gap-1">
        {[24, 60].map((count, part) => <Select key={part} disabled={disabled || !selected}
          value={time.split(":")[part]} onValueChange={next => {
            if (!selected) return;
            const parts = time.split(":"); parts[part] = next;
            onChange({ target: { value: `${localDateValue(selected)}T${parts.join(":")}` } });
          }}>
          <SelectTrigger aria-label={`${props["aria-label"] ?? zone} (${part === 0 ? "HH" : "mm"})`} className="h-10 w-20 rounded-xl border-0 bg-muted/55"><SelectValue /></SelectTrigger>
          <SelectContent className="scrollbar-custom max-h-64">{Array.from({ length: count }, (_, n) => String(n).padStart(2, "0")).map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}</SelectContent>
        </Select>)}
      </div>}
    </div>
    {type !== "date" && <p className="text-xs text-muted-foreground">{zone}</p>}
  </div>;
}
