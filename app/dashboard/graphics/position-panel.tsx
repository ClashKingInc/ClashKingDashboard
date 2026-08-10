"use client";

import React from "react";
import Image from "next/image";
import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  sortableKeyboardCoordinates,
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignStartVertical,
  BringToFront,
  Braces,
  GripVertical,
  ImageIcon,
  Layers3,
  Lock,
  SendToBack,
  Shapes,
  Type,
  Unlock,
} from "lucide-react";

import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

import type { CanvasAlignment, LayerAction } from "./editor-actions";
import { hasSelectionModifier, overlappingElementIds, resolveElementSelection } from "./editor-selection";
import type { GraphicDocument, GraphicElement } from "./graphic-document";

export type PositionPanelTab = "arrange" | "layers";

interface PositionPanelProps {
  document: GraphicDocument;
  selectedIds: string[];
  tab: PositionPanelTab;
  onTabChange: (tab: PositionPanelTab) => void;
  onSelectionChange: (ids: string[]) => void;
  onAlign: (alignment: CanvasAlignment, target: "canvas" | "selection") => void;
  onLayerAction: (action: LayerAction) => void;
  onLayerDrop: (activeId: string, overId: string) => void;
  onLockedChange: (locked: boolean) => void;
  onElementChange: (element: GraphicElement) => void;
}

const arrangeActions: readonly [LayerAction, string, typeof BringToFront][] = [
  ["forward", "Forward", BringToFront],
  ["backward", "Backward", SendToBack],
  ["front", "To front", Layers3],
  ["back", "To back", Layers3],
];

const alignActions: readonly [CanvasAlignment, string, typeof AlignStartHorizontal][] = [
  ["top", "Top", AlignStartHorizontal],
  ["left", "Left", AlignStartVertical],
  ["middle", "Middle", AlignCenterHorizontal],
  ["center", "Center", AlignCenterVertical],
  ["bottom", "Bottom", AlignEndHorizontal],
  ["right", "Right", AlignEndVertical],
];

export function PositionPanel(props: PositionPanelProps) {
  const [alignmentTarget, setAlignmentTarget] = React.useState<"canvas" | "selection">("canvas");
  const [layerScope, setLayerScope] = React.useState<"all" | "overlapping">("all");
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const selectedElements = props.document.elements.filter((element) => props.selectedIds.includes(element.id));
  const selected = selectedElements.at(-1) ?? null;
  const allLocked = selectedElements.length > 0 && selectedElements.every((element) => element.locked);
  const overlapping = new Set(overlappingElementIds(props.document.elements, props.selectedIds));
  const frontToBack = [...props.document.elements].reverse().filter((element) => layerScope === "all" || overlapping.has(element.id));

  const selectLayer = (elementId: string, event: React.MouseEvent) => {
    props.onSelectionChange(hasSelectionModifier(event)
      ? resolveElementSelection(props.selectedIds, elementId, event)
      : [elementId]);
  };
  const dragStarted = ({ active }: DragStartEvent) => {
    const id = String(active.id);
    if (!props.selectedIds.includes(id)) props.onSelectionChange([id]);
  };
  const dragEnded = ({ active, over }: DragEndEvent) => {
    if (over && active.id !== over.id) props.onLayerDrop(String(active.id), String(over.id));
  };

  return (
    <div className="space-y-4 p-4">
      <div><h2 className="text-base font-semibold">Position</h2><p className="text-xs text-muted-foreground">Arrange the selection and control its stacking order.</p></div>
      <Tabs value={props.tab} onValueChange={(value) => props.onTabChange(value as PositionPanelTab)}>
        <DashboardTabsList className="grid-cols-2">
          <DashboardTabTrigger value="arrange">Arrange</DashboardTabTrigger>
          <DashboardTabTrigger value="layers" count={props.document.elements.length}>Layers</DashboardTabTrigger>
        </DashboardTabsList>
        <TabsContent value="arrange" className="mt-4 space-y-5">
          <section className="space-y-2"><h3 className="text-sm font-semibold">Layer order</h3><div className="grid grid-cols-2 gap-2">{arrangeActions.map(([action, label, Icon]) => <Button key={action} variant="secondary" className="justify-start border-0 bg-muted/65 shadow-sm shadow-black/5" disabled={!selectedElements.length} onClick={() => props.onLayerAction(action)}><Icon />{label}</Button>)}</div></section>
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Align elements</h3>{selectedElements.length > 1 && <div className="flex rounded-xl bg-muted/55 p-1 text-[11px]"><button type="button" className={cn("rounded-lg px-2 py-1", alignmentTarget === "canvas" && "bg-card font-semibold shadow-sm")} onClick={() => setAlignmentTarget("canvas")}>Graphic</button><button type="button" className={cn("rounded-lg px-2 py-1", alignmentTarget === "selection" && "bg-card font-semibold shadow-sm")} onClick={() => setAlignmentTarget("selection")}>Selection</button></div>}</div>
            <div className="grid grid-cols-2 gap-2">{alignActions.map(([alignment, label, Icon]) => <Button key={alignment} variant="secondary" className="justify-start border-0 bg-muted/65 shadow-sm shadow-black/5" disabled={!selectedElements.some((element) => !element.locked)} onClick={() => props.onAlign(alignment, selectedElements.length > 1 ? alignmentTarget : "canvas")}><Icon />{label}</Button>)}</div>
          </section>
          <Button variant="secondary" className="w-full border-0 bg-muted/65" disabled={!selectedElements.length} onClick={() => props.onLockedChange(!allLocked)}>{allLocked ? <Unlock /> : <Lock />}{allLocked ? "Unlock selection" : "Lock selection"}</Button>
          {selected && selectedElements.length === 1 && <AdvancedPosition element={selected} onChange={props.onElementChange} />}
        </TabsContent>
        <TabsContent value="layers" className="mt-4 space-y-3">
          <div className="grid grid-cols-2 rounded-xl bg-muted/55 p-1 text-xs"><button type="button" className={cn("rounded-lg px-2 py-2", layerScope === "all" && "bg-card font-semibold shadow-sm")} onClick={() => setLayerScope("all")}>All</button><button type="button" disabled={!props.selectedIds.length} className={cn("rounded-lg px-2 py-2 disabled:opacity-40", layerScope === "overlapping" && "bg-card font-semibold shadow-sm")} onClick={() => setLayerScope("overlapping")}>Overlapping</button></div>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={dragStarted} onDragEnd={dragEnded}>
            <SortableContext items={frontToBack.map((element) => element.id)} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">{frontToBack.map((element) => <SortableLayerRow key={element.id} element={element} selected={props.selectedIds.includes(element.id)} onSelect={(event) => selectLayer(element.id, event)} />)}</div>
            </SortableContext>
          </DndContext>
          {!frontToBack.length && <div className="rounded-2xl bg-muted/40 p-5 text-center text-xs text-muted-foreground">No overlapping layers.</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SortableLayerRow({ element, selected, onSelect }: { element: GraphicElement; selected: boolean; onSelect: (event: React.MouseEvent) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: element.id, disabled: Boolean(element.locked) });
  return <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={cn("flex min-h-14 items-center gap-2 rounded-2xl bg-muted/45 p-2 transition-[background-color,box-shadow,opacity,transform]", selected && "bg-primary/10 shadow-[inset_0_0_0_2px_hsl(var(--primary)/0.65)]", isDragging && "relative z-10 opacity-50 shadow-lg")}>
    <button type="button" {...attributes} {...listeners} disabled={Boolean(element.locked)} className="touch-none cursor-grab rounded-lg p-1.5 text-muted-foreground hover:bg-background/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-35 active:cursor-grabbing" aria-label={`Reorder ${element.name}`}><GripVertical /></button>
    <button type="button" className="flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onSelect}><LayerPreview element={element} /><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{element.name}</span><span className="block truncate text-[10px] text-muted-foreground">{element.type === "shape" ? element.shape : element.type.replace("dynamic-", "dynamic ")}</span></span>{element.locked && <Lock className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}</button>
  </div>;
}

function LayerPreview({ element }: { element: GraphicElement }) {
  if (element.type === "image" || element.type === "dynamic-image") {
    const source = element.type === "image" ? element.source : element.placeholder;
    return <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded-lg bg-background/65"><Image src={source} alt="" fill unoptimized sizes="48px" className="object-contain p-1" /></span>;
  }
  const Icon = element.type === "text" ? Type : Shapes;
  return <span className="flex h-9 w-12 shrink-0 items-center justify-center rounded-lg bg-background/65 text-muted-foreground"><Icon className="h-4 w-4" /></span>;
}

function AdvancedPosition({ element, onChange }: { element: GraphicElement; onChange: (element: GraphicElement) => void }) {
  const fields = [["X", "x"], ["Y", "y"], ["Width", "width"], ["Height", "height"], ["Rotate", "rotation"]] as const;
  return <section className="space-y-2"><h3 className="text-sm font-semibold">Advanced</h3><div className="grid grid-cols-2 gap-2">{fields.map(([label, key]) => <label key={key} className="text-[11px] text-muted-foreground">{label}<input type="number" value={element[key]} onChange={(event) => onChange({ ...element, [key]: key === "width" || key === "height" ? Math.max(24, Number(event.target.value) || 24) : Number(event.target.value) || 0 } as GraphicElement)} className="mt-1 h-9 w-full rounded-xl border-0 bg-muted/55 px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label>)}</div></section>;
}
