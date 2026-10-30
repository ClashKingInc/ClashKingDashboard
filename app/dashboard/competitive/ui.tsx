import type { ReactNode } from "react";
import Image from "@/components/app-image";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// These paths come from clashking_assets; use the same artwork throughout the workspace.
export const competitiveArt = {
  tournaments: "https://assets.clashk.ing/bot/icons/trophy.png",
  teams: "https://assets.clashk.ing/bot/icons/clash_sword.png",
  matches: "https://assets.clashk.ing/bot/icons/war_star.png",
  landscape: "https://assets.clashk.ing/landscape/war-landscape.jpg",
};

export function Artwork({ kind, size = 24 }: { kind: keyof typeof competitiveArt; size?: number }) {
  return <Image src={competitiveArt[kind]} alt="" width={size} height={size} unoptimized className="shrink-0 object-contain" />;
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <Label className="flex min-w-0 flex-col gap-2 text-sm font-medium"><span>{label}</span>{children}{hint && <span className="text-xs font-normal leading-5 text-muted-foreground">{hint}</span>}</Label>;
}

export function Choice({ value, onChange, choices, disabled, label }: { value: string; onChange: (value: string) => void; choices: readonly { value: string; label: string }[]; disabled?: boolean; label?: string }) {
  return <Select value={value} onValueChange={onChange} disabled={disabled}><SelectTrigger aria-label={label} className="rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5"><SelectValue /></SelectTrigger><SelectContent>{choices.map(choice => <SelectItem key={choice.value} value={choice.value}>{choice.label}</SelectItem>)}</SelectContent></Select>;
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-3xl bg-muted/35 px-5 py-10 text-center text-sm text-muted-foreground">{children}</div>;
}

export function Pill({ children, active = false }: { children: ReactNode; active?: boolean }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted/65 text-muted-foreground"}`}>{children}</span>;
}

export const controlClass = "rounded-xl border-0 bg-muted/55 shadow-sm shadow-black/5";
export const rowClass = "rounded-3xl bg-card p-5 shadow-sm shadow-black/5";

export function dateLabel(value: string | null | undefined, locale?: string) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" });
}
