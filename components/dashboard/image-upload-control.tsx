"use client";

import { useId, useRef } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import Image from "@/components/app-image";
import { Button } from "@/components/ui/button";

// The same thumbnail + native picker pattern used by RosterAppearance.
export function ImageUploadControl({ image, file, disabled = false, label, chooseLabel, removeLabel, maxBytes, onChoose, onRemove, onTooLarge }: {
  image: string | null; file: File | null; disabled?: boolean;
  label: string; chooseLabel: string; removeLabel: string; maxBytes: number;
  onChoose: (file: File) => void; onRemove: () => void; onTooLarge: () => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  return <div className="space-y-3">
    <input id={id} ref={input} type="file" accept="image/*" tabIndex={-1} className="sr-only" aria-label={label} disabled={disabled} onChange={event => {
      const selected = event.target.files?.[0];
      event.target.value = "";
      if (!selected || disabled) return;
      if (selected.size > maxBytes) { onTooLarge(); return; }
      onChoose(selected);
    }} />
    {image ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex h-32 w-full items-center justify-center overflow-hidden rounded-2xl bg-muted/45 sm:w-56 sm:shrink-0">
        <Image src={image} alt={label} width={320} height={180} unoptimized className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1 space-y-3">
        {file && <div className="space-y-1"><p className="truncate text-sm font-medium" title={file.name}>{file.name}</p><p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p></div>}
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={disabled} className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted" onClick={() => input.current?.click()}><ImagePlus className="h-4 w-4" />{chooseLabel}</Button>
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={onRemove}><Trash2 className="h-4 w-4" />{removeLabel}</Button>
        </div>
      </div>
    </div> : <Button type="button" variant="secondary" aria-label={chooseLabel} disabled={disabled} onClick={() => input.current?.click()} className="h-28 w-full flex-col gap-2 rounded-2xl border-0 bg-muted/45 shadow-sm shadow-black/5 hover:bg-muted/65">
      <ImagePlus className="h-5 w-5 text-muted-foreground" /><span>{chooseLabel}</span><span className="text-xs font-normal text-muted-foreground">{maxBytes / 1024 / 1024} MB</span>
    </Button>}
  </div>;
}
