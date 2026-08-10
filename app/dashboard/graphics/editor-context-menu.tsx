"use client";

import { type KeyboardEvent, type MouseEvent, type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Copy,
  Download,
  ImageDown,
  Lock,
  PaintBucket,
  Trash2,
  Unlock,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { GraphicElement } from "./graphic-document";

export interface EditorContextMenuProps {
  children: ReactNode;
  element: GraphicElement;
  onDuplicate: (element: GraphicElement) => void;
  onDelete: (element: GraphicElement) => void;
  locked?: boolean;
  onLockedChange?: (element: GraphicElement, locked: boolean) => void;
  onDownloadSelection?: (element: GraphicElement) => void;
  onSetAsBackground?: (element: GraphicElement) => void;
  onSelectGroup?: (element: GraphicElement) => void;
  className?: string;
}

function ActionButton({ icon: Icon, children, onClick, destructive = false }: {
  icon: typeof Copy;
  children: ReactNode;
  onClick: () => void;
  destructive?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-accent", destructive && "text-destructive hover:text-destructive")}>
      <Icon className="h-4 w-4" aria-hidden="true" />{children}
    </button>
  );
}

function MenuSection({ label, children }: { label: string; children: ReactNode }) {
  return <div className="border-t border-border/60 px-1 py-1.5 first:border-0"><p className="px-2 py-1 text-[11px] font-medium text-muted-foreground">{label}</p>{children}</div>;
}

export function EditorContextMenu({
  children,
  element,
  onDuplicate,
  onDelete,
  locked = false,
  onLockedChange,
  onDownloadSelection,
  onSetAsBackground,
  onSelectGroup,
  className,
}: EditorContextMenuProps) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    const onKey = (event: globalThis.KeyboardEvent) => event.key === "Escape" && close();
    window.addEventListener("pointerdown", close);
    window.addEventListener("blur", close);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", onKey);
    };
  }, [anchor]);

  const openAtPointer = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setAnchor({ x: Math.min(event.clientX, window.innerWidth - 280), y: Math.min(event.clientY, window.innerHeight - 560) });
  };

  const openFromKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    setAnchor({ x: bounds.left + 24, y: bounds.top + 24 });
  };

  const run = (action: () => void) => {
    action();
    setAnchor(null);
  };

  return (
    <>
      <div className={cn("contents", className)} onContextMenu={openAtPointer} onKeyDown={openFromKeyboard}>{children}</div>
      {anchor && typeof globalThis.document !== "undefined" && createPortal(
        <div
          role="menu"
          aria-label={`Actions for ${element.name}`}
          className="fixed z-[200] max-h-[min(560px,calc(100vh-16px))] w-64 overflow-y-auto rounded-2xl bg-popover/98 p-1.5 shadow-2xl shadow-black/30 ring-1 ring-border/50 backdrop-blur-xl"
          style={{ left: Math.max(8, anchor.x), top: Math.max(8, anchor.y) }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <p className="truncate px-3 py-2 text-xs font-semibold">{element.name}</p>
          <MenuSection label="Actions">
            <ActionButton icon={Copy} onClick={() => run(() => onDuplicate(element))}>Duplicate</ActionButton>
            {element.groupId && onSelectGroup && <ActionButton icon={Users} onClick={() => run(() => onSelectGroup(element))}>Select matching group</ActionButton>}
            <ActionButton icon={Trash2} destructive onClick={() => run(() => onDelete(element))}>Delete</ActionButton>
          </MenuSection>
          <MenuSection label="Element">
            {onLockedChange && <ActionButton icon={locked ? Unlock : Lock} onClick={() => run(() => onLockedChange(element, !locked))}>{locked ? "Unlock" : "Lock"}</ActionButton>}
            {(element.type === "image" || element.type === "dynamic-image") && onSetAsBackground && <ActionButton icon={PaintBucket} onClick={() => run(() => onSetAsBackground(element))}>Set image as background</ActionButton>}
            {onDownloadSelection && <ActionButton icon={Download} onClick={() => run(() => onDownloadSelection(element))}>Download selection</ActionButton>}
          </MenuSection>
        </div>,
        globalThis.document.body,
      )}
    </>
  );
}

export function CanvasContextMenu({ children, onEditBackground, onRemoveBackground }: {
  children: ReactNode;
  onEditBackground: () => void;
  onRemoveBackground: () => void;
}) {
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!anchor) return;
    const close = () => setAnchor(null);
    window.addEventListener("pointerdown", close);
    window.addEventListener("keydown", close);
    return () => { window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", close); };
  }, [anchor]);
  return <>
    <div className="contents" onContextMenu={(event) => { event.preventDefault(); setAnchor({ x: event.clientX, y: event.clientY }); }}>{children}</div>
    {anchor && typeof globalThis.document !== "undefined" && createPortal(
      <div role="menu" className="fixed z-[190] w-60 rounded-2xl bg-popover/98 p-2 shadow-2xl ring-1 ring-border/50" style={{ left: Math.min(anchor.x, window.innerWidth - 250), top: Math.min(anchor.y, window.innerHeight - 140) }} onPointerDown={(event) => event.stopPropagation()}>
        <ActionButton icon={PaintBucket} onClick={() => { onEditBackground(); setAnchor(null); }}>Edit graphic background</ActionButton>
        <ActionButton icon={ImageDown} onClick={() => { onRemoveBackground(); setAnchor(null); }}>Remove background image</ActionButton>
      </div>, globalThis.document.body,
    )}
  </>;
}
