"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function EventOffsetInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const [zeroDirection, setZeroDirection] = useState<"before" | "after">("before");
  const direction = value === 0 ? zeroDirection : value < 0 ? "before" : "after";
  return <div className="space-y-2"><div className="flex flex-wrap items-center gap-2">
    <Input aria-label="Number of days" type="number" min={0} max={365} step={1} value={Math.abs(value)} className="w-24 rounded-xl border-0 bg-muted/55" onChange={event => {
      const days = Math.min(365, Math.max(0, Math.trunc(Number(event.target.value))));
      onChange(direction === "before" ? -days : days);
    }} /><span className="text-sm text-muted-foreground">days</span>
    {(["before", "after"] as const).map(option => <Button type="button" key={option} size="sm" variant={direction === option ? "default" : "secondary"} aria-pressed={direction === option} onClick={() => { setZeroDirection(option); onChange((option === "before" ? -1 : 1) * Math.abs(value)); }}>{option === "before" ? "Before" : "After"}</Button>)}
    <span className="text-sm text-muted-foreground">event start</span>
  </div><p className="text-xs text-muted-foreground">{value === 0 ? "Runs at the event start." : `Runs ${Math.abs(value)} day${Math.abs(value) === 1 ? "" : "s"} ${direction} the event.`}</p></div>;
}
