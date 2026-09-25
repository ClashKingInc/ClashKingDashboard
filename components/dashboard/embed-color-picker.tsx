"use client";

import { useState } from "react";
import { useTranslations } from "use-intl";
import { Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export const embedColorHex = (value: number) => `#${value.toString(16).padStart(6, "0").toUpperCase()}`;

/** Shared General Settings and roster-override control. Changes apply only on confirmation. */
export function EmbedColorPicker({ value, onChange, disabled = false, defaultValue = 14223113 }: {
  value: number; onChange: (value: number) => void; disabled?: boolean; defaultValue?: number;
}) {
  const t = useTranslations("GeneralPage");
  const common = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(embedColorHex(value));
  const valid = /^#[0-9a-f]{6}$/i.test(hex);
  return <Dialog open={open} onOpenChange={next => { if (next) setHex(embedColorHex(value)); setOpen(next); }}>
    <DialogTrigger asChild><Button variant="ghost" disabled={disabled} aria-label={t("appearance.editColor")}
      className="group relative h-12 w-12 shrink-0 overflow-hidden rounded-xl p-0 shadow-sm ring-1 ring-border ring-offset-2 ring-offset-card"
      style={{ backgroundColor: embedColorHex(value) }}>
      <span className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity group-hover:opacity-100"><Pencil className="h-4 w-4 text-white" /></span>
    </Button></DialogTrigger>
    <DialogContent variant="form" className="border-0 bg-card shadow-xl sm:max-w-md">
      <DialogHeader><DialogTitle>{t("appearance.editColor")}</DialogTitle><DialogDescription>{t("appearance.embedColorDesc")}</DialogDescription></DialogHeader>
      <div className="space-y-4 py-4"><div className="flex items-center gap-4">
        <Input aria-label={t("appearance.embedColor")} type="color" value={valid ? hex : embedColorHex(value)} onChange={event => setHex(event.target.value)} className="h-20 w-20 cursor-pointer rounded-xl p-1" />
        <Label className="flex-1 space-y-2"><span>Hex code</span><Input value={hex} maxLength={7} onChange={event => setHex(event.target.value)} placeholder="#D90709" className="font-mono text-lg" /></Label>
      </div><Button variant="ghost" size="sm" onClick={() => setHex(embedColorHex(defaultValue))}><RotateCcw className="mr-2 h-3 w-3" />{t("appearance.resetToDefault")}</Button></div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>{common("cancel")}</Button><Button disabled={!valid || disabled} onClick={() => { onChange(Number.parseInt(hex.slice(1), 16)); setOpen(false); }}>{t("appearance.apply")}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
