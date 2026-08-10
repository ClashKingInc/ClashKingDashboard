"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Copy,
  FlipHorizontal2,
  FlipVertical2,
  Image as ImageIcon,
  Italic,
  Move,
  Paintbrush,
  Shapes,
  Trash2,
  Underline,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import type { GraphicElement, ShapeElement, TextElement } from "./graphic-document";

export interface GraphicFontOption {
  label: string;
  value: string;
}

export interface SelectionToolbarProps {
  element: GraphicElement;
  onElementChange: (element: GraphicElement) => void;
  onPosition: (element: GraphicElement) => void;
  onDuplicate: (element: GraphicElement) => void;
  onDelete: (element: GraphicElement) => void;
  fontFamilies?: readonly GraphicFontOption[];
  onFlipHorizontal?: (element: GraphicElement) => void;
  onFlipVertical?: (element: GraphicElement) => void;
  onFormatPainter?: (element: TextElement) => void;
  formatPainterActive?: boolean;
  className?: string;
}

export const DEFAULT_GRAPHIC_FONT_FAMILIES: readonly GraphicFontOption[] = [
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Oswald", value: "Oswald, sans-serif" },
  { label: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
  { label: "Playfair Display", value: "'Playfair Display', serif" },
] as const;

const compactButtonClassName = "h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground";

function ToolbarDivider() {
  return <span aria-hidden="true" className="mx-0.5 h-5 w-px shrink-0 bg-border/70" />;
}

function pressedClassName(pressed: boolean) {
  return pressed ? "bg-primary/12 text-primary hover:bg-primary/18 hover:text-primary" : undefined;
}

export function SelectionToolbar({
  element,
  onElementChange,
  onPosition,
  onDuplicate,
  onDelete,
  fontFamilies = DEFAULT_GRAPHIC_FONT_FAMILIES,
  onFlipHorizontal,
  onFlipVertical,
  onFormatPainter,
  formatPainterActive = false,
  className,
}: SelectionToolbarProps) {
  const update = (patch: Partial<GraphicElement>) => {
    onElementChange({ ...element, ...patch } as GraphicElement);
  };

  return (
    <div
      role="toolbar"
      aria-label={`Editing ${element.name}`}
      className={cn(
        "flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-card/95 p-1.5 shadow-xl shadow-black/15 backdrop-blur-xl",
        className,
      )}
    >
      {element.type === "text" ? (
        <TextControls
          element={element}
          fontFamilies={fontFamilies}
          onChange={onElementChange}
        />
      ) : element.type === "shape" ? (
        <ShapeControls element={element} onChange={onElementChange} />
      ) : (
        <ImageControls
          element={element}
          onChange={onElementChange}
          onFlipHorizontal={onFlipHorizontal}
          onFlipVertical={onFlipVertical}
        />
      )}

      <ToolbarDivider />
      {element.type === "text" && onFormatPainter && <Button type="button" variant="ghost" size="icon" className={cn(compactButtonClassName, pressedClassName(formatPainterActive))} onClick={() => onFormatPainter(element)} aria-label="Copy text formatting" aria-pressed={formatPainterActive} title="Format painter"><Paintbrush /></Button>}
      <label className="flex h-8 items-center gap-2 rounded-lg bg-muted/55 px-2 text-xs text-muted-foreground">
        <span>Opacity</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={element.opacity}
          onChange={(event) => update({ opacity: Number(event.target.value) })}
          className="w-16 accent-primary"
          aria-label="Element opacity"
        />
        <span className="w-8 text-right tabular-nums">{Math.round(element.opacity * 100)}%</span>
      </label>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={compactButtonClassName}
        onClick={() => onPosition(element)}
        aria-label="Open position controls"
        title="Position"
      >
        <Move />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={compactButtonClassName}
        onClick={() => onDuplicate(element)}
        aria-label="Duplicate element"
        title="Duplicate"
      >
        <Copy />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(compactButtonClassName, "hover:text-destructive")}
        onClick={() => onDelete(element)}
        aria-label="Delete element"
        title="Delete"
      >
        <Trash2 />
      </Button>
    </div>
  );
}

function TextControls({
  element,
  fontFamilies,
  onChange,
}: {
  element: TextElement;
  fontFamilies: readonly GraphicFontOption[];
  onChange: (element: GraphicElement) => void;
}) {
  const setText = (patch: Partial<TextElement>) => onChange({ ...element, ...patch });
  const fontOptions = fontFamilies.some((font) => font.value === element.fontFamily)
    ? fontFamilies
    : [{ label: element.fontFamily, value: element.fontFamily }, ...fontFamilies];
  const standardWeights = [300, 400, 500, 600, 700, 800, 900];
  const fontWeights = standardWeights.includes(element.fontWeight)
    ? standardWeights
    : [...standardWeights, element.fontWeight].sort((a, b) => a - b);

  return (
    <>
      <Select value={element.fontFamily} onValueChange={(fontFamily) => setText({ fontFamily })}>
        <SelectTrigger className="h-8 w-36 border-0 bg-muted/55 px-2 shadow-sm shadow-black/5" aria-label="Font family">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontOptions.map((font) => (
            <SelectItem key={font.value} value={font.value} style={{ fontFamily: font.value }}>
              {font.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        type="number"
        min={8}
        max={500}
        value={element.fontSize}
        onChange={(event) => setText({ fontSize: Math.max(8, Number(event.target.value) || 8) })}
        className="h-8 w-16 border-0 bg-muted/55 px-2 text-center shadow-sm shadow-black/5"
        aria-label="Font size"
        title="Font size"
      />
      <Select value={String(element.fontWeight)} onValueChange={(value) => setText({ fontWeight: Number(value) })}>
        <SelectTrigger className="h-8 w-[4.5rem] border-0 bg-muted/55 px-2 shadow-sm shadow-black/5" aria-label="Font weight">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {fontWeights.map((weight) => (
            <SelectItem key={weight} value={String(weight)}>{weight}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(compactButtonClassName, pressedClassName(element.fontWeight >= 700))}
        onClick={() => setText({ fontWeight: element.fontWeight >= 700 ? 400 : 700 })}
        aria-label="Bold"
        aria-pressed={element.fontWeight >= 700}
        title="Bold"
      >
        <Bold />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(compactButtonClassName, pressedClassName(element.fontStyle === "italic"))}
        onClick={() => setText({ fontStyle: element.fontStyle === "italic" ? "normal" : "italic" })}
        aria-label="Italic"
        aria-pressed={element.fontStyle === "italic"}
        title="Italic"
      >
        <Italic />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={cn(compactButtonClassName, pressedClassName(element.textDecoration === "underline"))}
        onClick={() => setText({ textDecoration: element.textDecoration === "underline" ? "none" : "underline" })}
        aria-label="Underline"
        aria-pressed={element.textDecoration === "underline"}
        title="Underline"
      >
        <Underline />
      </Button>
      <label
        className="relative flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-accent focus-within:ring-2 focus-within:ring-ring"
        title="Text color"
      >
        <span className="sr-only">Text color</span>
        <span className="text-sm font-semibold" aria-hidden="true">A</span>
        <span className="absolute bottom-1 h-1 w-4 rounded-full" style={{ backgroundColor: element.color }} />
        <input
          type="color"
          value={element.color}
          onChange={(event) => setText({ color: event.target.value })}
          className="absolute inset-0 cursor-pointer opacity-0"
          aria-label="Text color"
        />
      </label>
      <label className="flex h-8 items-center gap-1.5 rounded-lg bg-muted/55 px-2 text-xs text-muted-foreground" title="Text outline width">
        <span>Outline</span>
        <Input
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={element.strokeWidth ?? 0}
          onChange={(event) => setText({ strokeWidth: Math.max(0, Math.min(24, Number(event.target.value) || 0)) })}
          className="h-6 w-12 border-0 bg-background/65 px-1 text-center shadow-none"
          aria-label="Text outline width"
        />
        <span className="relative h-5 w-5 overflow-hidden rounded-md ring-1 ring-border/60" style={{ backgroundColor: element.strokeColor ?? "#000000" }}>
          <input
            type="color"
            value={element.strokeColor ?? "#000000"}
            onChange={(event) => setText({ strokeColor: event.target.value })}
            className="absolute inset-0 cursor-pointer opacity-0"
            aria-label="Text outline color"
          />
        </span>
      </label>
      <ToolbarDivider />
      {([
        ["left", AlignLeft],
        ["center", AlignCenter],
        ["right", AlignRight],
      ] as const).map(([align, Icon]) => (
        <Button
          key={align}
          type="button"
          variant="ghost"
          size="icon"
          className={cn(compactButtonClassName, pressedClassName(element.align === align))}
          onClick={() => setText({ align })}
          aria-label={`Align text ${align}`}
          aria-pressed={element.align === align}
          title={`Align ${align}`}
        >
          <Icon />
        </Button>
      ))}
    </>
  );
}

function ImageControls({
  element,
  onChange,
  onFlipHorizontal,
  onFlipVertical,
}: {
  element: Exclude<GraphicElement, TextElement | ShapeElement>;
  onChange: (element: GraphicElement) => void;
  onFlipHorizontal?: (element: GraphicElement) => void;
  onFlipVertical?: (element: GraphicElement) => void;
}) {
  return (
    <>
      <ImageIcon className="mx-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <Select value={element.fit} onValueChange={(fit: "contain" | "cover") => onChange({ ...element, fit })}>
        <SelectTrigger className="h-8 w-24 border-0 bg-muted/55 px-2 shadow-sm shadow-black/5" aria-label="Image fit">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="contain">Contain</SelectItem>
          <SelectItem value="cover">Cover</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={compactButtonClassName}
        onClick={() => onFlipHorizontal ? onFlipHorizontal(element) : onChange({ ...element, flipX: !element.flipX })}
        aria-label="Flip horizontally"
        title="Flip horizontally"
      >
        <FlipHorizontal2 />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className={compactButtonClassName}
        onClick={() => onFlipVertical ? onFlipVertical(element) : onChange({ ...element, flipY: !element.flipY })}
        aria-label="Flip vertically"
        title="Flip vertically"
      >
        <FlipVertical2 />
      </Button>
    </>
  );
}

function ShapeControls({ element, onChange }: { element: ShapeElement; onChange: (element: GraphicElement) => void }) {
  const setShape = (patch: Partial<ShapeElement>) => onChange({ ...element, ...patch });
  const areaShape = element.shape === "rectangle" || element.shape === "ellipse";
  const lineShape = element.shape === "line" || element.shape === "arrow";
  return (
    <>
      <Shapes className="mx-1 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      {areaShape && (
        <Button type="button" variant="ghost" size="sm" className={cn("h-8", pressedClassName(element.fillEnabled))} onClick={() => setShape({ fillEnabled: !element.fillEnabled })} aria-pressed={element.fillEnabled}>Fill</Button>
      )}
      {areaShape && element.fillEnabled && <ColorControl label="Shape fill" value={element.fillColor} onChange={(fillColor) => setShape({ fillColor })} />}
      <ColorControl label="Shape stroke" value={element.strokeColor} onChange={(strokeColor) => setShape({ strokeColor })} />
      <Input type="number" min={0} max={100} step={1} value={element.strokeWidth} onChange={(event) => setShape({ strokeWidth: Math.max(0, Math.min(100, Number(event.target.value) || 0)) })} className="h-8 w-16 border-0 bg-muted/55 px-2 text-center" aria-label={lineShape ? "Line weight" : "Border width"} title={lineShape ? "Line weight" : "Border width"} />
      <Select value={element.strokeDash} onValueChange={(strokeDash: ShapeElement["strokeDash"]) => setShape({ strokeDash })}>
        <SelectTrigger className="h-8 w-24 border-0 bg-muted/55 px-2" aria-label="Stroke style"><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="solid">Solid</SelectItem><SelectItem value="dashed">Dashed</SelectItem><SelectItem value="dotted">Dotted</SelectItem></SelectContent>
      </Select>
      {element.shape === "rectangle" && <Input type="number" min={0} max={Math.min(element.width, element.height) / 2} value={element.cornerRadius} onChange={(event) => setShape({ cornerRadius: Math.max(0, Math.min(Math.min(element.width, element.height) / 2, Number(event.target.value) || 0)) })} className="h-8 w-20 border-0 bg-muted/55 px-2 text-center" aria-label="Corner radius" title="Corner radius" />}
      {lineShape && (
        <Select value={`${element.arrowStart}:${element.arrowEnd}`} onValueChange={(value) => {
          const [arrowStart, arrowEnd] = value.split(":") as [ShapeElement["arrowStart"], ShapeElement["arrowEnd"]];
          setShape({ arrowStart, arrowEnd });
        }}>
          <SelectTrigger className="h-8 w-28 border-0 bg-muted/55 px-2" aria-label="Arrow endpoints"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="none:none">No arrows</SelectItem><SelectItem value="none:arrow">End arrow</SelectItem><SelectItem value="arrow:none">Start arrow</SelectItem><SelectItem value="arrow:arrow">Both ends</SelectItem></SelectContent>
        </Select>
      )}
    </>
  );
}

function ColorControl({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="relative h-8 w-8 shrink-0 cursor-pointer rounded-lg bg-muted/55 p-1.5" title={label}><span className="block h-full w-full rounded-md ring-1 ring-border/50" style={{ backgroundColor: value }} /><input type="color" value={value} onChange={(event) => onChange(event.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={label} /></label>;
}
