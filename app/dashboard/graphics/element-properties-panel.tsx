"use client";

import { Braces, ImageIcon, Lock, Shapes, SlidersHorizontal, Trash2, Type, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DynamicFieldInput } from "./dynamic-field-input";
import { bindingToken, findDynamicField, getBindingsInText, type DynamicField } from "./dynamic-fields";
import type { DynamicImageElement, GraphicElement, ShapeElement, StaticImageElement, TextElement } from "./graphic-document";

export function ElementPropertiesPanel({ element, dynamicFields, onChange, onAddImageField, onDelete }: {
  element: GraphicElement;
  dynamicFields: readonly DynamicField[];
  onChange: (element: GraphicElement) => void;
  onAddImageField: (field: DynamicField) => void;
  onDelete: () => void;
}) {
  const setCommon = <K extends keyof GraphicElement>(key: K, value: GraphicElement[K]) => onChange({ ...element, [key]: value } as GraphicElement);
  return (
    <div className="space-y-5 p-4">
      <div className="flex items-start gap-2">
        <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {element.type === "text" ? <Type className="h-4 w-4" /> : element.type === "dynamic-image" ? <Braces className="h-4 w-4" /> : element.type === "shape" ? <Shapes className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold">Element settings</h2>
          <Input value={element.name} onChange={(event) => setCommon("name", event.target.value)} className="mt-1 h-8 border-0 bg-muted/55 shadow-sm shadow-black/5" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <NumberField label="X" value={element.x} onChange={(value) => setCommon("x", value)} />
        <NumberField label="Y" value={element.y} onChange={(value) => setCommon("y", value)} />
        <NumberField label="Width" value={element.width} onChange={(value) => setCommon("width", Math.max(24, value))} />
        <NumberField label="Height" value={element.height} onChange={(value) => setCommon("height", Math.max(24, value))} />
        <NumberField label="Rotate" value={element.rotation} onChange={(value) => setCommon("rotation", value)} />
        <NumberField label="Opacity" value={element.opacity} step={0.05} onChange={(value) => setCommon("opacity", Math.max(0, Math.min(1, value)))} />
      </div>

      <Button type="button" variant="secondary" className="w-full border-0 bg-muted/65 shadow-sm shadow-black/5" onClick={() => setCommon("locked", !element.locked)}>
        {element.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} {element.locked ? "Unlock element" : "Lock element"}
      </Button>

      <div className="h-px bg-border/70" />
      {element.type === "text" && <TextProperties element={element} dynamicFields={dynamicFields} onChange={onChange} onAddImageField={onAddImageField} />}
      {element.type === "image" && <ImageProperties element={element} onChange={onChange} />}
      {element.type === "dynamic-image" && <DynamicImageProperties element={element} onChange={onChange} />}
      {element.type === "shape" && <ShapeProperties element={element} onChange={onChange} />}

      <Button type="button" variant="ghost" className="w-full text-muted-foreground hover:text-destructive" onClick={onDelete}><Trash2 className="h-4 w-4" /> Delete element</Button>
    </div>
  );
}

function ShapeProperties({ element, onChange }: { element: ShapeElement; onChange: (element: GraphicElement) => void }) {
  const setShape = (patch: Partial<ShapeElement>) => onChange({ ...element, ...patch });
  const areaShape = element.shape === "rectangle" || element.shape === "ellipse";
  const lineShape = element.shape === "line" || element.shape === "arrow";
  return (
    <div className="space-y-4">
      <div className="space-y-1.5"><Label className="text-xs">Shape</Label><Select value={element.shape} onValueChange={(shape: ShapeElement["shape"]) => setShape({ shape })}><SelectTrigger className="border-0 bg-muted/55"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="rectangle">Rectangle</SelectItem><SelectItem value="ellipse">Ellipse</SelectItem><SelectItem value="line">Line</SelectItem><SelectItem value="arrow">Arrow</SelectItem></SelectContent></Select></div>
      {areaShape && <Button variant={element.fillEnabled ? "secondary" : "ghost"} className="w-full" onClick={() => setShape({ fillEnabled: !element.fillEnabled })}>{element.fillEnabled ? "Remove fill" : "Add fill"}</Button>}
      <div className="grid grid-cols-2 gap-3">
        {areaShape && element.fillEnabled && <ColorField label="Fill color" value={element.fillColor} onChange={(fillColor) => setShape({ fillColor })} />}
        <ColorField label={lineShape ? "Line color" : "Border color"} value={element.strokeColor} onChange={(strokeColor) => setShape({ strokeColor })} />
        <NumberField label={lineShape ? "Line weight" : "Border width"} value={element.strokeWidth} onChange={(strokeWidth) => setShape({ strokeWidth: Math.max(0, Math.min(100, strokeWidth)) })} />
        {element.shape === "rectangle" && <NumberField label="Corner radius" value={element.cornerRadius} onChange={(cornerRadius) => setShape({ cornerRadius: Math.max(0, Math.min(Math.min(element.width, element.height) / 2, cornerRadius)) })} />}
      </div>
      <div className="space-y-1.5"><Label className="text-xs">Stroke style</Label><Select value={element.strokeDash} onValueChange={(strokeDash: ShapeElement["strokeDash"]) => setShape({ strokeDash })}><SelectTrigger className="border-0 bg-muted/55"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem><SelectItem value="dotted">Dotted</SelectItem></SelectContent></Select></div>
      {lineShape && <div className="space-y-1.5"><Label className="text-xs">Arrow endpoints</Label><Select value={`${element.arrowStart}:${element.arrowEnd}`} onValueChange={(value) => { const [arrowStart, arrowEnd] = value.split(":") as [ShapeElement["arrowStart"], ShapeElement["arrowEnd"]]; setShape({ arrowStart, arrowEnd }); }}><SelectTrigger className="border-0 bg-muted/55"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none:none">None</SelectItem><SelectItem value="none:arrow">End</SelectItem><SelectItem value="arrow:none">Start</SelectItem><SelectItem value="arrow:arrow">Both</SelectItem></SelectContent></Select></div>}
    </div>
  );
}

function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="space-y-1.5 text-xs">{label}<input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="block h-10 w-full cursor-pointer rounded-xl bg-muted/55 p-1" /></label>;
}

function TextProperties({ element, dynamicFields, onChange, onAddImageField }: { element: TextElement; dynamicFields: readonly DynamicField[]; onChange: (element: GraphicElement) => void; onAddImageField: (field: DynamicField) => void }) {
  const bindings = getBindingsInText(element.content);
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor={`text-content-${element.id}`} className="text-xs">Text</Label>
        <DynamicFieldInput id={`text-content-${element.id}`} value={element.content} fields={dynamicFields} onChange={(content) => onChange({ ...element, content })} onImageField={onAddImageField} rows={5} />
        <p className="text-[11px] text-muted-foreground">Type <code className="text-primary">[</code> to insert dynamic fields.</p>
      </div>
      <div className="rounded-2xl bg-muted/45 p-3">
        <h3 className="mb-2 text-xs font-semibold">Text outline</h3>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <NumberField label="Width" value={element.strokeWidth ?? 0} step={0.5} onChange={(strokeWidth) => onChange({ ...element, strokeWidth: Math.max(0, Math.min(24, strokeWidth)) })} />
          <label className="space-y-1.5 text-xs">Color<input type="color" value={element.strokeColor ?? "#000000"} onChange={(event) => onChange({ ...element, strokeColor: event.target.value })} className="block h-10 w-12 cursor-pointer rounded-xl bg-background/70 p-1" /></label>
        </div>
      </div>
      {bindings.length > 0 && (
        <div>
          <h3 className="mb-2 text-xs font-semibold">Missing-data fallbacks</h3>
          <div className="space-y-2">
            {bindings.map((binding) => (
              <div key={binding} className="rounded-xl bg-muted/45 p-2.5">
                <code className="mb-1.5 block text-[11px] text-primary">{bindingToken(binding)}</code>
                <Input value={element.fallbacks[binding] ?? ""} onChange={(event) => onChange({ ...element, fallbacks: { ...element.fallbacks, [binding]: event.target.value } })} placeholder={findDynamicField(binding)?.placeholder || "Leave empty"} className="h-8 border-0 bg-background/65 text-xs shadow-sm shadow-black/5" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ImageProperties({ element, onChange }: { element: StaticImageElement; onChange: (element: GraphicElement) => void }) {
  return (
    <div className="space-y-3">
      <div className="space-y-1.5"><Label className="text-xs">Source</Label><Input value={element.source} onChange={(event) => onChange({ ...element, source: event.target.value })} className="border-0 bg-muted/55 text-xs shadow-sm shadow-black/5" /></div>
      <FitSelect value={element.fit} onChange={(fit) => onChange({ ...element, fit })} />
    </div>
  );
}

function DynamicImageProperties({ element, onChange }: { element: DynamicImageElement; onChange: (element: GraphicElement) => void }) {
  return (
    <div className="space-y-3">
      <div className="rounded-xl bg-sky-500/10 px-3 py-2"><span className="text-[11px] text-sky-600 dark:text-sky-400">One image binding</span><code className="mt-0.5 block text-xs font-semibold">{bindingToken(element.binding)}</code></div>
      <FitSelect value={element.fit} onChange={(fit) => onChange({ ...element, fit })} />
      <div className="space-y-1.5">
        <Label className="text-xs">If data is missing</Label>
        <Select value={element.fallback.behavior} onValueChange={(behavior: DynamicImageElement["fallback"]["behavior"]) => onChange({ ...element, fallback: { ...element.fallback, behavior } })}>
          <SelectTrigger className="border-0 bg-muted/55 shadow-sm shadow-black/5"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="placeholder">Use placeholder</SelectItem><SelectItem value="hide">Hide image</SelectItem><SelectItem value="image">Use fallback image</SelectItem></SelectContent>
        </Select>
      </div>
      {element.fallback.behavior === "image" && <div className="space-y-1.5"><Label className="text-xs">Fallback URL</Label><Input value={element.fallback.source ?? ""} onChange={(event) => onChange({ ...element, fallback: { ...element.fallback, source: event.target.value } })} placeholder={element.placeholder} className="border-0 bg-muted/55 text-xs shadow-sm shadow-black/5" /></div>}
      <div className="space-y-1.5"><Label className="text-xs">Editor placeholder</Label><Input value={element.placeholder} onChange={(event) => onChange({ ...element, placeholder: event.target.value })} className="border-0 bg-muted/55 text-xs shadow-sm shadow-black/5" /></div>
    </div>
  );
}

function FitSelect({ value, onChange }: { value: "contain" | "cover"; onChange: (value: "contain" | "cover") => void }) {
  return <div className="space-y-1.5"><Label className="text-xs">Image fit</Label><Select value={value} onValueChange={(next: "contain" | "cover") => onChange(next)}><SelectTrigger className="border-0 bg-muted/55 shadow-sm shadow-black/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="contain">Contain</SelectItem><SelectItem value="cover">Cover</SelectItem></SelectContent></Select></div>;
}

function NumberField({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (value: number) => void; step?: number }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label><Input type="number" value={value} step={step} onChange={(event) => onChange(Number(event.target.value) || 0)} className="border-0 bg-muted/55 shadow-sm shadow-black/5" /></div>;
}
