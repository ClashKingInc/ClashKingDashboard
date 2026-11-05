"use client";
import { useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import Image from "@/components/app-image";
import { Button } from "@/components/ui/button";
import { EmbedColorPicker } from "@/components/dashboard/embed-color-picker";

export function RosterAppearance({ image, color, serverColor, uploading, onUpload, onImageChange, onColorChange }: {
  image?: string; color?: number | null; serverColor: number; uploading: boolean;
  onUpload: (file: File) => Promise<void>; onImageChange: (image: string) => void; onColorChange: (color: number | null) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  return <div className="grid gap-5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
    <div className="space-y-2"><p className="text-sm font-medium">Roster image</p>
      <input ref={fileInput} className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif" aria-label="Upload roster image" disabled={uploading} onChange={event => { const file = event.target.files?.[0]; if (file) void onUpload(file); event.target.value = ""; }} />
      {image ? <div className="relative w-fit max-w-full overflow-hidden rounded-2xl bg-muted/40">
        <Image src={image} alt="Roster embed image" width={300} height={170} className="max-h-44 w-auto max-w-full object-contain" unoptimized />
        <Button type="button" variant="secondary" size="icon" className="absolute right-2 top-2 h-8 w-8 shadow-sm" aria-label="Remove roster image" disabled={uploading} onClick={() => onImageChange("")}><Trash2 className="h-4 w-4" /></Button>
      </div> : <Button type="button" variant="secondary" className="h-28 w-full flex-col gap-2 rounded-2xl bg-muted/45" disabled={uploading} onClick={() => fileInput.current?.click()}><ImagePlus className="h-5 w-5 text-muted-foreground" />{uploading ? "Uploading…" : "Add image"}</Button>}
    </div>
    <div className="space-y-2"><p className="text-sm font-medium">Embed color</p><div className="flex items-center gap-4 rounded-2xl bg-muted/35 p-4">
      <EmbedColorPicker value={color ?? serverColor} defaultValue={serverColor} onChange={onColorChange} />
      <div className="min-w-0"><p className="text-sm">{color == null ? "Server color" : "Custom color"}</p><p className="text-xs text-muted-foreground">{color == null ? "Inherited from General Settings" : "Only used by this roster"}</p>
      {color != null && <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => onColorChange(null)}>Use server color</Button>}</div>
    </div></div>
  </div>;
}
