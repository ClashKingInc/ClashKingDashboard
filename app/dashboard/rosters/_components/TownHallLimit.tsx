import Image from "@/components/app-image";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { townHallImageUrl } from "@/lib/clash-asset-urls";

export function TownHallLimit({ label, value, onChange, minimum, maximum, initial }: {
  label: string; value: string; onChange: (value: string) => void; minimum: number; maximum: number; initial: number;
}) {
  return <div className="space-y-2">
    <div className="flex min-h-6 items-center justify-between gap-2">
      <span className="text-sm font-medium">{label}</span>
      <Switch aria-label={label} checked={value !== ""} onCheckedChange={enabled => onChange(enabled ? String(initial) : "")} />
    </div>
    <Select value={value} disabled={value === ""} onValueChange={onChange}>
      <SelectTrigger aria-label={label} className="h-10 rounded-xl border-0 bg-muted/55"><SelectValue placeholder="—" /></SelectTrigger>
      <SelectContent>
        {Array.from({ length: Math.max(0, maximum - minimum + 1) }, (_, index) => minimum + index).map(level =>
          <SelectItem key={level} value={String(level)}><span className="flex items-center gap-2">
            <Image src={townHallImageUrl(level)} alt="" width={26} height={26} />{level}
          </span></SelectItem>)}
      </SelectContent>
    </Select>
  </div>;
}
