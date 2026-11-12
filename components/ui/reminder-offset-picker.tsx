"use client";

import { useEffect, useState } from "react";
import { Input } from "./input";
import { Button } from "./button";

/** Quarter-hour offsets. Coarse pointers get native pickers without a keyboard;
 * desktop users can type decimal hours or choose a common offset in one click. */
export function ReminderOffsetPicker({id,value,onChange,label,unit}:{id:string;value:string;onChange:(value:string)=>void;label:string;unit:string}) {
  const [touch,setTouch]=useState(false);
  useEffect(()=>{const media=window.matchMedia("(pointer: coarse)");const update=()=>setTouch(media.matches);update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
  const total=Number(value),hours=Number.isFinite(total)?Math.floor(total):0,minutes=Math.round((total-hours)*60);
  const change=(h:number,m:number)=>onChange(String(Math.min(48,h+m/60)));
  return <div className="space-y-2">
    {touch ? <div className="grid grid-cols-2 gap-2">
      <select id={id} aria-label={`${label} (${unit})`} className="h-12 min-w-0 rounded-xl bg-muted/55 px-3 text-base focus-visible:ring-2 focus-visible:ring-ring" value={value===""?"":hours} onChange={event=>change(Number(event.target.value),minutes)}>
        <option value="" disabled>— {unit}</option>
        {Array.from({length:49},(_,hour)=><option key={hour} value={hour}>{hour} {unit}</option>)}
      </select>
      <select aria-label={`${label} (:00–:45)`} className="h-12 min-w-0 rounded-xl bg-muted/55 px-3 text-base focus-visible:ring-2 focus-visible:ring-ring" value={hours===48?0:minutes} disabled={hours===48} onChange={event=>change(hours,Number(event.target.value))}>
        {[0,15,30,45].map(minute=><option key={minute} value={minute}>:{String(minute).padStart(2,"0")}</option>)}
      </select>
    </div> : <div className="flex items-center gap-2"><Input id={id} type="number" inputMode="decimal" min={0} max={48} step={0.25} value={value} onChange={event=>onChange(event.target.value)} aria-label={label}/><span className="text-sm text-muted-foreground">{unit}</span></div>}
    <div className="flex flex-wrap gap-1.5">{[1,6,12,24,48].map(hour=><Button key={hour} type="button" variant="secondary" size="sm" aria-pressed={value!==""&&total===hour} className={total===hour&&value!==""?"bg-primary/15 text-primary ring-1 ring-primary":""} onClick={()=>onChange(String(hour))}>{hour} {unit}</Button>)}</div>
  </div>;
}
