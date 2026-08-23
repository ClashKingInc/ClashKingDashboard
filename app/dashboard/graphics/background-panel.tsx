"use client";

import { ImageIcon, PaintBucket, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GraphicCanvas } from "./graphic-document";

interface BackgroundPanelProps {
  canvas: GraphicCanvas;
  onChange: (canvas: GraphicCanvas) => void;
  onUpload: () => void;
}

export function BackgroundPanel({ canvas, onChange, onUpload }: BackgroundPanelProps) {
  const backgroundImage = canvas.backgroundImage;
  return (
    <div className="space-y-5 p-4">
      <div>
        <h2 className="flex items-center gap-2 text-sm font-semibold"><PaintBucket className="h-4 w-4" /> Background</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">Set a color, an image, or both.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="graphic-background-color" className="text-xs">Canvas color</Label>
        <div className="flex gap-2">
          <input
            id="graphic-background-color"
            type="color"
            value={canvas.background}
            onChange={(event) => onChange({ ...canvas, background: event.target.value })}
            className="h-10 w-12 rounded-xl bg-muted/55 p-1 shadow-sm shadow-black/5"
          />
          <Input
            value={canvas.background}
            onChange={(event) => onChange({ ...canvas, background: event.target.value })}
            className="border-0 bg-muted/55 font-mono shadow-sm shadow-black/5"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="graphic-background-image" className="text-xs">Background image</Label>
        <Input
          id="graphic-background-image"
          value={backgroundImage?.source ?? ""}
          placeholder="Paste an image URL"
          onChange={(event) => onChange({
            ...canvas,
            backgroundImage: event.target.value
              ? { source: event.target.value, fit: backgroundImage?.fit ?? "cover", opacity: backgroundImage?.opacity ?? 1 }
              : undefined,
          })}
          className="border-0 bg-muted/55 text-xs shadow-sm shadow-black/5"
        />
        <Button type="button" variant="secondary" className="w-full border-0 bg-muted/65 shadow-sm shadow-black/5" onClick={onUpload}>
          <Upload className="h-4 w-4" /> Upload background
        </Button>
      </div>

      {backgroundImage && (
        <div className="space-y-3 rounded-2xl bg-muted/40 p-3">
          <div className="flex items-center gap-2 text-xs font-semibold"><ImageIcon className="h-4 w-4 text-primary" /> Image settings</div>
          <div className="space-y-1.5">
            <Label className="text-xs">Fit</Label>
            <Select value={backgroundImage.fit} onValueChange={(fit: "contain" | "cover") => onChange({ ...canvas, backgroundImage: { ...backgroundImage, fit } })}>
              <SelectTrigger className="border-0 bg-background/65 shadow-sm shadow-black/5"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="cover">Fill canvas</SelectItem><SelectItem value="contain">Fit inside</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <div className="flex justify-between"><Label htmlFor="background-opacity" className="text-xs">Opacity</Label><span className="text-xs text-muted-foreground">{Math.round(backgroundImage.opacity * 100)}%</span></div>
            <input id="background-opacity" type="range" min="0" max="1" step="0.05" value={backgroundImage.opacity} onChange={(event) => onChange({ ...canvas, backgroundImage: { ...backgroundImage, opacity: Number(event.target.value) } })} className="w-full accent-primary" />
          </div>
          <Button type="button" variant="ghost" size="sm" className="w-full text-muted-foreground hover:text-destructive" onClick={() => onChange({ ...canvas, backgroundImage: undefined })}>
            <Trash2 className="h-4 w-4" /> Remove image
          </Button>
        </div>
      )}
    </div>
  );
}

