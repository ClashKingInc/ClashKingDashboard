"use client";

import { useEffect, useState } from "react";
import { Check, Ratio } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CanvasResizeRequest {
  width: number;
  height: number;
  scaleElements: boolean;
}

const PRESETS = [
  { label: "Discord landscape", width: 1200, height: 630 },
  { label: "Square", width: 1080, height: 1080 },
  { label: "Portrait", width: 1080, height: 1350 },
  { label: "Story", width: 1080, height: 1920 },
] as const;

export function ResizeCanvasDialog({ open, width, height, onOpenChange, onApply }: {
  open: boolean;
  width: number;
  height: number;
  onOpenChange: (open: boolean) => void;
  onApply: (request: CanvasResizeRequest) => void;
}) {
  const [draftWidth, setDraftWidth] = useState(width);
  const [draftHeight, setDraftHeight] = useState(height);
  const [scaleElements, setScaleElements] = useState(true);

  useEffect(() => {
    if (!open) return;
    setDraftWidth(width);
    setDraftHeight(height);
  }, [height, open, width]);

  const valid = draftWidth >= 100 && draftHeight >= 100 && draftWidth <= 8000 && draftHeight <= 8000;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent variant="form" className="border-0 bg-card shadow-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Resize canvas</DialogTitle>
          <DialogDescription>Choose a common output size or enter exact pixel dimensions.</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((preset) => {
            const selected = draftWidth === preset.width && draftHeight === preset.height;
            return (
              <button key={preset.label} type="button" onClick={() => { setDraftWidth(preset.width); setDraftHeight(preset.height); }} className={`rounded-2xl p-3 text-left transition-colors ${selected ? "bg-primary/10 text-primary ring-2 ring-primary/35" : "bg-muted/45 hover:bg-muted"}`}>
                <span className="block text-sm font-semibold">{preset.label}</span>
                <span className="text-xs text-muted-foreground">{preset.width} × {preset.height}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div className="space-y-1.5"><Label htmlFor="canvas-width" className="text-xs">Width</Label><Input id="canvas-width" type="number" min={100} max={8000} value={draftWidth} onChange={(event) => setDraftWidth(Number(event.target.value))} className="border-0 bg-muted/55 shadow-sm shadow-black/5" /></div>
          <Ratio className="mb-3 h-4 w-4 text-muted-foreground" />
          <div className="space-y-1.5"><Label htmlFor="canvas-height" className="text-xs">Height</Label><Input id="canvas-height" type="number" min={100} max={8000} value={draftHeight} onChange={(event) => setDraftHeight(Number(event.target.value))} className="border-0 bg-muted/55 shadow-sm shadow-black/5" /></div>
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-muted/40 p-3 text-sm">
          <Checkbox checked={scaleElements} onCheckedChange={(checked) => setScaleElements(checked === true)} />
          <span><span className="block font-medium">Scale existing elements</span><span className="block text-xs text-muted-foreground">Keep the composition proportional to the new canvas.</span></span>
        </label>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={!valid} onClick={() => { onApply({ width: Math.round(draftWidth), height: Math.round(draftHeight), scaleElements }); onOpenChange(false); }}><Check className="h-4 w-4" /> Resize</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
