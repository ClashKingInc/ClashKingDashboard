"use client";

import {
  type DragEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import {
  ArrowLeft,
  Braces,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  EyeOff,
  FileJson,
  ImageIcon,
  Images,
  Hand,
  Layers3,
  Lock,
  Loader2,
  Maximize2,
  Minus,
  PaintBucket,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Redo2,
  Save,
  Search,
  Settings2,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Unlock,
  Upload,
} from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { useGuildId } from "@/lib/dashboard-route";
import { cn } from "@/lib/utils";
import { useAuthSession } from "@/components/auth-session-provider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { ServerClanListItem } from "@/lib/api/types/server";
import { BackgroundPanel } from "./background-panel";
import {
  alignElements,
  applyStyleToElement,
  copyElementStyle,
  deleteElement,
  deleteElements,
  duplicateElement,
  moveElementsByDelta,
  moveElementsWithKeyboard,
  reorderElementsByLayerDrop,
  reorderSelectedElements,
  resizeCanvas,
  selectElementGroup,
  setElementsLocked,
  type CanvasAlignment,
  type GraphicElementStyle,
  type LayerAction,
} from "./editor-actions";
import { CanvasContextMenu, EditorContextMenu } from "./editor-context-menu";
import { ElementPropertiesPanel } from "./element-properties-panel";
import { EDITOR_FONTS, editorFontStack, googleFontStylesheetUrl } from "./font-catalog";
import { ResizeCanvasDialog, type CanvasResizeRequest } from "./resize-canvas-dialog";
import { SelectionToolbar, type GraphicFontOption } from "./selection-toolbar";
import { type LibraryAsset, type LibraryAssetSourceKind } from "./asset-sources";
import { readLibraryAssetDragData, useAssetLibrary, writeLibraryAssetDragData } from "./asset-browser";
import {
  bindingToken,
  getDynamicFieldsForDocument,
  mapClanApiData,
  mapPlayerApiData,
  mapWarApiData,
  type DynamicField,
} from "./dynamic-fields";
import {
  createElementId,
  DEFAULT_GRAPHIC_DOCUMENT,
  normalizeGraphicWarSize,
  type BindingValues,
  type GraphicDocument,
  type GraphicElement,
  type GraphicPreviewMode,
  type StaticImageElement,
  type ShapeElement,
  type TextElement,
} from "./graphic-document";
import {
  hasSelectionModifier,
  mergeSelectionIds,
  resolveElementSelection,
  selectElementIdsInRect,
  selectionRectBetween,
  type CanvasPoint,
  type CanvasRect,
} from "./editor-selection";
import { graphicDocumentToSvg, inlineSvgImages, resolveDynamicImage, resolveTextElement, validateGraphicDocument } from "./svg-renderer";
import { rasterizeGraphicText } from "./text-rasterizer";
import { resizeTextElement, withAutoTextHeight } from "./text-layout";
import { GraphicProjectHub } from "./graphic-project-hub";
import { PositionPanel, type PositionPanelTab } from "./position-panel";
import { embeddedImageValidationError, graphicProjectsStorageKey, storeGraphicProjects } from "./graphic-project-storage";
import { createGraphicProject, parseGraphicProjects, type GraphicProjectRecord } from "./graphic-projects";
import { proxyClashApiAssetUrl } from "./asset-url";
import { dispatchGraphicsEditorMode } from "@/lib/graphics-editor-shell";
type EditorPanel = "clashking" | "fankit" | "dynamic" | "text" | "shapes" | "uploads" | "background" | "position" | "properties";

interface EditorHistory {
  past: GraphicDocument[];
  present: GraphicDocument;
  future: GraphicDocument[];
}

interface PointerInteraction {
  id: string;
  ids: string[];
  mode: "move" | "resize" | "rotate";
  resizeHandle?: ResizeHandle;
  startX: number;
  startY: number;
  element: GraphicElement;
  document: GraphicDocument;
}

interface MarqueeInteraction {
  pointerId: number;
  start: CanvasPoint;
  initialIds: string[];
  additive: boolean;
}

type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

const MIN_ELEMENT_SIZE = 24;
const MAX_HISTORY = 60;
let resvgInitialization: Promise<void> | null = null;

const RESIZE_HANDLES: readonly { id: ResizeHandle; cursor: string; style: { left?: string | number; right?: string | number; top?: string | number; bottom?: string | number; transform: string } }[] = [
  { id: "nw", cursor: "nwse-resize", style: { left: 0, top: 0, transform: "translate(-50%, -50%)" } },
  { id: "n", cursor: "ns-resize", style: { left: "50%", top: 0, transform: "translate(-50%, -50%)" } },
  { id: "ne", cursor: "nesw-resize", style: { right: 0, top: 0, transform: "translate(50%, -50%)" } },
  { id: "e", cursor: "ew-resize", style: { right: 0, top: "50%", transform: "translate(50%, -50%)" } },
  { id: "se", cursor: "nwse-resize", style: { right: 0, bottom: 0, transform: "translate(50%, 50%)" } },
  { id: "s", cursor: "ns-resize", style: { left: "50%", bottom: 0, transform: "translate(-50%, 50%)" } },
  { id: "sw", cursor: "nesw-resize", style: { left: 0, bottom: 0, transform: "translate(-50%, 50%)" } },
  { id: "w", cursor: "ew-resize", style: { left: 0, top: "50%", transform: "translate(-50%, -50%)" } },
];

const FONT_OPTIONS: readonly GraphicFontOption[] = EDITOR_FONTS.map((font) => ({
  label: font.family,
  value: editorFontStack(font.family),
}));

function cloneDefaultDocument(): GraphicDocument {
  return structuredClone(DEFAULT_GRAPHIC_DOCUMENT);
}

function defaultTextElement(kind: "heading" | "subheading" | "body" = "heading", x = 100, y = 100): TextElement {
  const settings = kind === "heading"
    ? { name: "Heading", content: "Add a heading", fontSize: 64, fontWeight: 800, height: 100 }
    : kind === "subheading"
      ? { name: "Subheading", content: "Add a subheading", fontSize: 38, fontWeight: 600, height: 72 }
      : { name: "Body text", content: "Add a little bit of body text", fontSize: 24, fontWeight: 400, height: 90 };
  return {
    id: createElementId(),
    type: "text",
    x,
    y,
    width: 540,
    rotation: 0,
    opacity: 1,
    color: "#ffffff",
    fontFamily: editorFontStack("Inter"),
    fontStyle: "normal",
    textDecoration: "none",
    align: "left",
    lineHeight: 1.2,
    fallbacks: {},
    ...settings,
  };
}

function staticImageElement(asset: Pick<LibraryAsset, "name" | "source" | "width" | "height">, x: number, y: number): StaticImageElement {
  const ratio = asset.width && asset.height ? asset.width / asset.height : 1;
  const width = ratio >= 1 ? 240 : Math.max(100, Math.round(240 * ratio));
  const height = ratio >= 1 ? Math.max(100, Math.round(240 / ratio)) : 240;
  return {
    id: createElementId(),
    type: "image",
    name: asset.name,
    x,
    y,
    width,
    height,
    rotation: 0,
    opacity: 1,
    source: asset.source,
    fit: "contain",
  };
}

function dynamicElement(field: DynamicField, x: number, y: number): GraphicElement {
  if (field.kind === "image") {
    return {
      id: createElementId(), type: "dynamic-image", name: field.label, x, y,
      width: 220, height: 220, rotation: 0, opacity: 1, binding: field.key,
      placeholder: field.placeholder, fit: "contain", fallback: { behavior: "placeholder" },
    };
  }
  const text = defaultTextElement("subheading", x, y);
  return { ...text, name: field.label, content: bindingToken(field.key), fallbacks: { [field.key]: field.placeholder } };
}

function shapeElement(shape: ShapeElement["shape"], name: string, width: number, height: number, x: number, y: number): ShapeElement {
  const lineShape = shape === "line" || shape === "arrow";
  return {
    id: createElementId(), type: "shape", shape, name, x, y, width, height,
    rotation: 0, opacity: 1, fillEnabled: !lineShape, fillColor: "#e00000",
    strokeColor: "#ffffff", strokeWidth: lineShape ? 6 : 0, strokeDash: "solid",
    cornerRadius: shape === "rectangle" ? 16 : 0, arrowStart: "none", arrowEnd: shape === "arrow" ? "arrow" : "none",
  };
}

interface ShapePreset {
  id: string;
  name: string;
  shape: ShapeElement["shape"];
  width: number;
  height: number;
}

const SHAPE_PRESETS: readonly ShapePreset[] = [
  { id: "rectangle", name: "Rectangle", shape: "rectangle", width: 260, height: 160 },
  { id: "square", name: "Square", shape: "rectangle", width: 180, height: 180 },
  { id: "circle", name: "Circle", shape: "ellipse", width: 180, height: 180 },
  { id: "ellipse", name: "Ellipse", shape: "ellipse", width: 260, height: 160 },
  { id: "line", name: "Line", shape: "line", width: 280, height: 24 },
  { id: "arrow", name: "Arrow", shape: "arrow", width: 280, height: 32 },
];

function centerPosition(document: GraphicDocument, width = 240, height = 240) {
  return {
    x: Math.max(0, Math.round((document.canvas.width - width) / 2)),
    y: Math.max(0, Math.round((document.canvas.height - height) / 2)),
  };
}

function isTypingTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || (target instanceof HTMLElement && target.isContentEditable);
}

interface PendingProjectSave {
  storageKey: string;
  projectId: string;
  projects: GraphicProjectRecord[];
}

export function GraphicEditor() {
  const guildId = useGuildId();
  const { user } = useAuthSession();
  const projectStorageKey = user?.user_id ? graphicProjectsStorageKey(user.user_id, guildId) : null;
  const [projects, setProjects] = useState<GraphicProjectRecord[]>([]);
  const projectsRef = useRef<GraphicProjectRecord[]>([]);
  const [projectsLoaded, setProjectsLoaded] = useState(false);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [history, setHistory] = useState<EditorHistory>(() => ({ past: [], present: cloneDefaultDocument(), future: [] }));
  const document = history.present;
  const dynamicFields = getDynamicFieldsForDocument(document);
  const [selectedIds, setSelectedIds] = useState<string[]>(["profile-heading"]);
  const selectedId = selectedIds.at(-1) ?? null;
  const setSelectedId = useCallback((id: string | null) => setSelectedIds(id ? [id] : []), []);
  const [activePanel, setActivePanel] = useState<EditorPanel>("clashking");
  const [panelOpen, setPanelOpen] = useState(true);
  const [previewMode, setPreviewMode] = useState<GraphicPreviewMode>("placeholder");
  const [liveBindings, setLiveBindings] = useState<BindingValues>({});
  const [uploads, setUploads] = useState<LibraryAsset[]>([]);
  const [zoom, setZoom] = useState(1);
  const [fitScale, setFitScale] = useState(0.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panTool, setPanTool] = useState(false);
  const [positionTab, setPositionTab] = useState<PositionPanelTab>("arrange");
  const [panning, setPanning] = useState<{ x: number; y: number; originX: number; originY: number } | null>(null);
  const [interaction, setInteraction] = useState<PointerInteraction | null>(null);
  const [marqueeRect, setMarqueeRect] = useState<CanvasRect | null>(null);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [jsonOpen, setJsonOpen] = useState(false);
  const [jsonDraft, setJsonDraft] = useState("");
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [copiedElement, setCopiedElement] = useState<GraphicElement | null>(null);
  const [copiedStyle, setCopiedStyle] = useState<GraphicElementStyle | null>(null);
  const [formatPainterStyle, setFormatPainterStyle] = useState<GraphicElementStyle | null>(null);
  const canvasAreaRef = useRef<HTMLDivElement>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const backgroundUploadRef = useRef<HTMLInputElement>(null);
  const marqueeRef = useRef<MarqueeInteraction | null>(null);
  const pendingProjectSaveRef = useRef<PendingProjectSave | null>(null);
  const projectSaveTimerRef = useRef<number | null>(null);
  const selected = document.elements.find((element) => element.id === selectedId) ?? null;
  const selectedElements = document.elements.filter((element) => selectedIds.includes(element.id));
  const allSelectedLocked = selectedElements.length > 0 && selectedElements.every((element) => element.locked);
  const scale = fitScale * zoom;
  const svg = useMemo(() => graphicDocumentToSvg(document, { mode: previewMode, bindings: liveBindings }), [document, liveBindings, previewMode]);

  useEffect(() => {
    dispatchGraphicsEditorMode(Boolean(activeProjectId));
    return () => dispatchGraphicsEditorMode(false);
  }, [activeProjectId]);

  const commitDocument = useCallback((updater: GraphicDocument | ((current: GraphicDocument) => GraphicDocument)) => {
    setHistory((current) => {
      const next = typeof updater === "function" ? updater(current.present) : updater;
      if (next === current.present) return current;
      return { past: [...current.past.slice(-(MAX_HISTORY - 1)), current.present], present: next, future: [] };
    });
  }, []);

  const undo = useCallback(() => {
    setHistory((current) => {
      const previous = current.past.at(-1);
      if (!previous) return current;
      return { past: current.past.slice(0, -1), present: previous, future: [current.present, ...current.future] };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory((current) => {
      const next = current.future[0];
      if (!next) return current;
      return { past: [...current.past, current.present], present: next, future: current.future.slice(1) };
    });
  }, []);

  const persistProjects = useCallback((next: GraphicProjectRecord[]): boolean => {
    if (!projectStorageKey) {
      setStatus("Sign in again before saving this graphic.");
      return false;
    }
    const storageError = storeGraphicProjects(localStorage, projectStorageKey, next);
    if (storageError) {
      setStatus(storageError);
      return false;
    }
    projectsRef.current = next;
    setProjects(next);
    return true;
  }, [projectStorageKey]);

  const flushPendingProjectSave = useCallback((updateEditorState = true): boolean => {
    if (projectSaveTimerRef.current !== null) {
      window.clearTimeout(projectSaveTimerRef.current);
      projectSaveTimerRef.current = null;
    }
    const pending = pendingProjectSaveRef.current;
    if (!pending) return true;
    pendingProjectSaveRef.current = null;
    const storageError = storeGraphicProjects(localStorage, pending.storageKey, pending.projects);
    if (storageError) {
      if (updateEditorState) setStatus(storageError);
      return false;
    }
    if (updateEditorState) {
      projectsRef.current = pending.projects;
      setProjects(pending.projects);
    }
    return true;
  }, []);

  useEffect(() => () => {
    flushPendingProjectSave(false);
  }, [flushPendingProjectSave]);

  useEffect(() => {
    if (!projectStorageKey) return;
    flushPendingProjectSave(false);
    setProjectsLoaded(false);
    projectsRef.current = [];
    setProjects([]);
    setActiveProjectId(null);
    const storedProjects = localStorage.getItem(projectStorageKey);
    try {
      const parsedProjects = storedProjects ? parseGraphicProjects(JSON.parse(storedProjects) as unknown) : [];
      if (parsedProjects.length) {
        projectsRef.current = parsedProjects;
        setProjects(parsedProjects);
        setProjectsLoaded(true);
        return;
      }
    } catch {
      // A malformed local draft should never prevent the projects page opening.
    } finally {
      setProjectsLoaded(true);
    }
  }, [flushPendingProjectSave, guildId, projectStorageKey]);

  useEffect(() => {
    if (!activeProjectId || !projectsLoaded || !projectStorageKey) return;
    const existingPending = pendingProjectSaveRef.current;
    if (existingPending && (existingPending.projectId !== activeProjectId || existingPending.storageKey !== projectStorageKey)) {
      flushPendingProjectSave(existingPending.storageKey === projectStorageKey);
    }
    if (!projectsRef.current.some((project) => project.id === activeProjectId)) return;
    pendingProjectSaveRef.current = {
      storageKey: projectStorageKey,
      projectId: activeProjectId,
      projects: projectsRef.current.map((project) => project.id === activeProjectId
        ? { ...project, kind: document.kind ?? project.kind, updatedAt: new Date().toISOString(), document }
        : project),
    };
    if (projectSaveTimerRef.current !== null) window.clearTimeout(projectSaveTimerRef.current);
    projectSaveTimerRef.current = window.setTimeout(() => flushPendingProjectSave(), 600);
    return () => {
      if (projectSaveTimerRef.current !== null) {
        window.clearTimeout(projectSaveTimerRef.current);
        projectSaveTimerRef.current = null;
      }
    };
  }, [activeProjectId, document, flushPendingProjectSave, projectStorageKey, projectsLoaded]);

  const openProject = useCallback((id: string) => {
    if (!flushPendingProjectSave()) return;
    const project = projectsRef.current.find((candidate) => candidate.id === id);
    if (!project) return;
    setHistory({ past: [], present: structuredClone(project.document), future: [] });
    setSelectedIds([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setActiveProjectId(id);
  }, [flushPendingProjectSave]);

  const createProject = useCallback((kind: GraphicProjectRecord["kind"], warSize?: number) => {
    if (!flushPendingProjectSave()) return;
    const project = createGraphicProject(kind, warSize);
    const next = [project, ...projectsRef.current];
    if (!persistProjects(next)) return;
    setHistory({ past: [], present: structuredClone(project.document), future: [] });
    setSelectedIds([]);
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setActiveProjectId(project.id);
  }, [flushPendingProjectSave, persistProjects]);

  const deleteProject = useCallback((id: string) => {
    if (!flushPendingProjectSave()) return;
    persistProjects(projectsRef.current.filter((project) => project.id !== id));
  }, [flushPendingProjectSave, persistProjects]);

  useEffect(() => {
    const area = canvasAreaRef.current;
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => {
      const availableWidth = Math.max(240, entry.contentRect.width - 72);
      const availableHeight = Math.max(200, entry.contentRect.height - 72);
      setFitScale(Math.max(0.05, Math.min(1.25, availableWidth / document.canvas.width, availableHeight / document.canvas.height)));
    });
    observer.observe(area);
    return () => observer.disconnect();
  }, [document.canvas.height, document.canvas.width, panelOpen]);

  useEffect(() => {
    const families = new Set(document.elements.filter((element): element is TextElement => element.type === "text").map((element) => element.fontFamily));
    for (const stack of families) {
      const font = EDITOR_FONTS.find((candidate) => stack.includes(candidate.family));
      if (!font) continue;
      const href = googleFontStylesheetUrl(font.family);
      if (!href || globalThis.document.querySelector(`link[data-graphic-font="${font.family}"]`)) continue;
      const link = globalThis.document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.dataset.graphicFont = font.family;
      globalThis.document.head.append(link);
    }
  }, [document.elements]);

  useEffect(() => {
    if (!interaction) return;
    const onMove = (event: PointerEvent) => {
      const deltaX = (event.clientX - interaction.startX) / scale;
      const deltaY = (event.clientY - interaction.startY) / scale;
      if (interaction.mode === "move") {
        const moved = moveElementsByDelta(
          interaction.document,
          interaction.ids,
          Math.round(deltaX),
          Math.round(deltaY),
        );
        setHistory((current) => ({ ...current, present: moved }));
        return;
      }
      setHistory((current) => ({
        ...current,
        present: {
          ...current.present,
          elements: current.present.elements.map((element) => {
            if (!interaction.ids.includes(element.id)) return element;
            if (interaction.mode === "resize") {
              if (element.id !== interaction.id) return element;
              const handle = interaction.resizeHandle ?? "se";
              if (interaction.element.type === "text") {
                return resizeTextElement(
                  interaction.element,
                  resolveTextElement(interaction.element, previewMode, liveBindings),
                  handle,
                  deltaX,
                  deltaY,
                  current.present.canvas,
                  MIN_ELEMENT_SIZE,
                );
              }
              const west = handle.includes("w");
              const east = handle.includes("e");
              const north = handle.includes("n");
              const south = handle.includes("s");
              let x = interaction.element.x;
              let y = interaction.element.y;
              let width = interaction.element.width;
              let height = interaction.element.height;
              const minimumWidth = MIN_ELEMENT_SIZE;
              if (east) width = Math.min(current.present.canvas.width - x, Math.max(minimumWidth, width + deltaX));
              if (south) height = Math.min(current.present.canvas.height - y, Math.max(MIN_ELEMENT_SIZE, height + deltaY));
              if (west) {
                const nextX = Math.max(0, Math.min(interaction.element.x + interaction.element.width - minimumWidth, interaction.element.x + deltaX));
                width = interaction.element.width + interaction.element.x - nextX;
                x = nextX;
              }
              if (north) {
                const nextY = Math.max(0, Math.min(interaction.element.y + interaction.element.height - MIN_ELEMENT_SIZE, interaction.element.y + deltaY));
                height = interaction.element.height + interaction.element.y - nextY;
                y = nextY;
              }
              return { ...element, x: Math.round(x), y: Math.round(y), width: Math.round(width), height: Math.round(height) };
            }
            if (element.id !== interaction.id) return element;
            const centerX = element.x + element.width / 2;
            const centerY = element.y + element.height / 2;
            const bounds = canvasAreaRef.current?.getBoundingClientRect();
            if (!bounds) return element;
            const canvasLeft = bounds.left + (bounds.width - current.present.canvas.width * scale) / 2 + pan.x;
            const canvasTop = bounds.top + (bounds.height - current.present.canvas.height * scale) / 2 + pan.y;
            const pointerX = (event.clientX - canvasLeft) / scale;
            const pointerY = (event.clientY - canvasTop) / scale;
            return { ...element, rotation: Math.round(Math.atan2(pointerY - centerY, pointerX - centerX) * 180 / Math.PI + 90) };
          }),
        },
      }));
    };
    const onUp = () => {
      setHistory((current) => current.present === interaction.document ? current : {
        past: [...current.past.slice(-(MAX_HISTORY - 1)), interaction.document],
        present: current.present,
        future: [],
      });
      setInteraction(null);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [interaction, liveBindings, pan.x, pan.y, previewMode, scale]);

  useEffect(() => {
    if (!panning) return;
    const onMove = (event: PointerEvent) => setPan({ x: panning.originX + event.clientX - panning.x, y: panning.originY + event.clientY - panning.y });
    const onUp = () => setPanning(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [panning]);

  const updateElement = useCallback((next: GraphicElement) => {
    const normalized = next.type === "text"
      ? withAutoTextHeight(next, resolveTextElement(next, previewMode, liveBindings))
      : next;
    commitDocument((current) => ({ ...current, elements: current.elements.map((element) => element.id === normalized.id ? normalized : element) }));
  }, [commitDocument, liveBindings, previewMode]);

  const addElement = useCallback((element: GraphicElement) => {
    commitDocument((current) => ({ ...current, elements: [...current.elements, element] }));
    setSelectedId(element.id);
  }, [commitDocument, setSelectedId]);

  const addAsset = useCallback((asset: Pick<LibraryAsset, "name" | "source" | "width" | "height">, position?: { x: number; y: number }) => {
    const center = position ?? centerPosition(document);
    addElement(staticImageElement(asset, center.x, center.y));
  }, [addElement, document]);

  const addDynamicField = useCallback((field: DynamicField, position?: { x: number; y: number }) => {
    const center = position ?? centerPosition(document);
    addElement(dynamicElement(field, center.x, center.y));
  }, [addElement, document]);

  const addText = useCallback((kind: "heading" | "subheading" | "body") => {
    const center = centerPosition(document, 540, kind === "body" ? 90 : 100);
    addElement(defaultTextElement(kind, center.x, center.y));
    setActivePanel("properties");
  }, [addElement, document]);

  const addShape = useCallback((preset: ShapePreset) => {
    const center = centerPosition(document, preset.width, preset.height);
    addElement(shapeElement(preset.shape, preset.name, preset.width, preset.height, center.x, center.y));
  }, [addElement, document]);

  const runAction = useCallback((action: (current: GraphicDocument) => GraphicDocument) => commitDocument(action), [commitDocument]);

  const duplicateSelected = useCallback((element: GraphicElement) => {
    const id = createElementId();
    runAction((current) => duplicateElement(current, element.id, { createId: () => id }));
    setSelectedId(id);
  }, [runAction, setSelectedId]);

  const deleteSelected = useCallback((element: GraphicElement) => {
    runAction((current) => deleteElement(current, element.id));
    setSelectedId(null);
  }, [runAction, setSelectedId]);

  const deleteCurrentSelection = useCallback(() => {
    runAction((current) => deleteElements(current, selectedIds));
    setSelectedIds([]);
  }, [runAction, selectedIds]);

  const alignCurrentSelection = useCallback((alignment: CanvasAlignment, target: "canvas" | "selection" = "canvas") => {
    runAction((current) => alignElements(current, selectedIds, alignment, target));
  }, [runAction, selectedIds]);

  const setCurrentSelectionLocked = useCallback((locked: boolean) => {
    runAction((current) => setElementsLocked(current, selectedIds, locked));
  }, [runAction, selectedIds]);

  const reorderCurrentSelection = useCallback((action: LayerAction) => {
    runAction((current) => reorderSelectedElements(current, selectedIds, action));
  }, [runAction, selectedIds]);

  const reorderFromLayerDrop = useCallback((activeId: string, overId: string) => {
    runAction((current) => reorderElementsByLayerDrop(current, selectedIds, activeId, overId));
  }, [runAction, selectedIds]);

  const openPositionPanel = useCallback((tab: PositionPanelTab = "arrange") => {
    setPositionTab(tab);
    setActivePanel("position");
    setPanelOpen(true);
  }, []);

  const startFormatPainter = useCallback((element: TextElement) => {
    setFormatPainterStyle(copyElementStyle(element));
    setStatus("Format painter active — select another text element");
  }, []);

  const setImageAsBackground = useCallback((element: GraphicElement) => {
    if (element.type !== "image" && element.type !== "dynamic-image") return;
    const source = element.type === "image" ? element.source : resolveDynamicImage(element, previewMode, liveBindings);
    if (!source) return;
    runAction((current) => {
      const withoutElement = deleteElement(current, element.id);
      return { ...withoutElement, canvas: { ...withoutElement.canvas, backgroundImage: { source: proxyClashApiAssetUrl(source), fit: "cover", opacity: element.opacity } } };
    });
    setSelectedIds([]);
    setActivePanel("background");
    setPanelOpen(true);
  }, [liveBindings, previewMode, runAction]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target)) return;
      const command = event.metaKey || event.ctrlKey;
      if (event.key === "Escape" && formatPainterStyle) {
        setFormatPainterStyle(null);
        setStatus(null);
        return;
      }
      if (command && event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
        return;
      }
      if (command && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }
      if (command && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelectedIds(document.elements.map((element) => element.id));
        return;
      }
      if (command && event.key.toLowerCase() === "c" && selected) {
        event.preventDefault();
        setCopiedElement(structuredClone(selected));
        return;
      }
      if (command && event.altKey && event.key.toLowerCase() === "c" && selected) {
        event.preventDefault();
        setCopiedStyle(copyElementStyle(selected));
        return;
      }
      if (command && event.key.toLowerCase() === "v") {
        event.preventDefault();
        if (copiedStyle && selected) updateElement(applyStyleToElement(document, selected.id, copiedStyle).elements.find((item) => item.id === selected.id) ?? selected);
        else if (copiedElement) {
          const copy = { ...structuredClone(copiedElement), id: createElementId(), name: `${copiedElement.name} copy`, x: copiedElement.x + 16, y: copiedElement.y + 16 };
          addElement(copy);
        }
        return;
      }
      if (!selected) return;
      if (command && event.key.toLowerCase() === "d" && !selected.locked) {
        event.preventDefault();
        duplicateSelected(selected);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteCurrentSelection();
      } else if (event.key.startsWith("Arrow")) {
        event.preventDefault();
        runAction((current) => moveElementsWithKeyboard(current, selectedIds, event));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [addElement, copiedElement, copiedStyle, deleteCurrentSelection, document, duplicateSelected, formatPainterStyle, redo, runAction, selected, selectedIds, undo, updateElement]);

  const beginInteraction = (event: ReactPointerEvent, element: GraphicElement, mode: PointerInteraction["mode"], resizeHandle?: ResizeHandle) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.button !== 0) return;
    if (panTool) {
      setPanning({ x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y });
      return;
    }
    if (formatPainterStyle) {
      if (element.type === "text" && formatPainterStyle.type === "text") {
        const styled = applyStyleToElement(document, element.id, formatPainterStyle).elements.find((candidate) => candidate.id === element.id);
        if (styled) updateElement(styled);
        setSelectedId(element.id);
        setFormatPainterStyle(null);
        setStatus("Text formatting applied");
        window.setTimeout(() => setStatus(null), 1800);
      } else {
        setStatus("Format painter only applies to text elements");
      }
      return;
    }
    const additive = hasSelectionModifier(event);
    const wasSelected = selectedIds.includes(element.id);
    const ids = resolveElementSelection(selectedIds, element.id, event);
    setSelectedIds(ids);
    if (additive && wasSelected) return;
    if (element.locked) return;
    const interactionIds = mode === "move"
      ? ids.filter((id) => !document.elements.find((candidate) => candidate.id === id)?.locked)
      : [element.id];
    if (!interactionIds.length) return;
    setInteraction({ id: element.id, ids: interactionIds, mode, resizeHandle, startX: event.clientX, startY: event.clientY, element, document });
  };

  const canvasPoint = (event: ReactPointerEvent<HTMLDivElement>): CanvasPoint => {
    const bounds = event.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(document.canvas.width, (event.clientX - bounds.left) / scale)),
      y: Math.max(0, Math.min(document.canvas.height, (event.clientY - bounds.top) / scale)),
    };
  };

  const beginMarqueeSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || panTool || event.target !== event.currentTarget) return;
    event.preventDefault();
    event.stopPropagation();
    const start = canvasPoint(event);
    const additive = hasSelectionModifier(event);
    const initialIds = additive ? [...selectedIds] : [];
    marqueeRef.current = { pointerId: event.pointerId, start, initialIds, additive };
    setMarqueeRect(selectionRectBetween(start, start));
    setSelectedIds(initialIds);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const updateMarqueeSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    const marquee = marqueeRef.current;
    if (!marquee || marquee.pointerId !== event.pointerId) return;
    event.preventDefault();
    const rect = selectionRectBetween(marquee.start, canvasPoint(event));
    setMarqueeRect(rect);
    const ids = selectElementIdsInRect(document.elements, rect);
    setSelectedIds(marquee.additive ? mergeSelectionIds(marquee.initialIds, ids) : ids);
  };

  const finishMarqueeSelection = (event: ReactPointerEvent<HTMLDivElement>) => {
    const marquee = marqueeRef.current;
    if (!marquee || marquee.pointerId !== event.pointerId) return;
    updateMarqueeSelection(event);
    marqueeRef.current = null;
    setMarqueeRect(null);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const libraryAsset = readLibraryAssetDragData(event.dataTransfer);
    const rect = event.currentTarget.getBoundingClientRect();
    const position = { x: Math.max(0, Math.round((event.clientX - rect.left) / scale - 110)), y: Math.max(0, Math.round((event.clientY - rect.top) / scale - 110)) };
    if (libraryAsset) {
      addAsset(libraryAsset, position);
      return;
    }
    const raw = event.dataTransfer.getData("application/x-clashking-graphic");
    if (!raw) return;
    if (raw.startsWith("dynamic:")) {
      const field = dynamicFields.find((candidate) => candidate.key === raw.slice("dynamic:".length));
      if (field) addDynamicField(field, position);
      return;
    }
    if (!raw.startsWith("asset:")) return;
    try {
      const asset = JSON.parse(raw.slice("asset:".length)) as LibraryAsset;
      if (asset?.source && asset?.name) addAsset(asset, position);
    } catch {
      // Ignore malformed external drag data.
    }
  };

  const handleUploads = (files: FileList | null, asBackground = false) => {
    if (!files) return;
    [...files].forEach((file) => {
      const validationError = embeddedImageValidationError(file);
      if (validationError) {
        setStatus(`${file.name}: ${validationError}`);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const source = String(reader.result);
        if (asBackground) {
          commitDocument((current) => ({ ...current, canvas: { ...current.canvas, backgroundImage: { source, fit: "cover", opacity: 1 } } }));
          return;
        }
        const asset: LibraryAsset = { id: `upload:${createElementId()}`, name: file.name, source, thumbnail: source, sourceKind: "clashking", category: "Uploads" };
        setUploads((current) => [...current, asset]);
        addAsset(asset);
      };
      reader.onerror = () => setStatus(`${file.name}: This image could not be read.`);
      reader.readAsDataURL(file);
    });
  };

  const saveDraft = (): boolean => {
    if (!activeProjectId || !projectStorageKey) return false;
    const next = projectsRef.current.map((project) => project.id === activeProjectId
      ? { ...project, kind: document.kind ?? project.kind, updatedAt: new Date().toISOString(), document }
      : project);
    pendingProjectSaveRef.current = { storageKey: projectStorageKey, projectId: activeProjectId, projects: next };
    if (!flushPendingProjectSave()) return false;
    setStatus("Saved in this browser");
    window.setTimeout(() => setStatus(null), 2200);
    return true;
  };

  const openJson = () => {
    setJsonDraft(JSON.stringify(document, null, 2));
    setJsonError(null);
    setJsonOpen(true);
  };

  const applyJson = () => {
    try {
      const parsed: unknown = JSON.parse(jsonDraft);
      if (!validateGraphicDocument(parsed)) throw new Error("This JSON does not match graphic document version 1.");
      commitDocument(parsed);
      setSelectedId(parsed.elements[0]?.id ?? null);
      setJsonOpen(false);
    } catch (error) {
      setJsonError(error instanceof Error ? error.message : "Invalid JSON");
    }
  };

  const renderPng = async (sourceDocument: GraphicDocument, filename: string) => {
    // resvg-wasm intentionally ships without browser/system fonts. Rasterize
    // text with the same loaded browser fonts first, then let resvg compose the
    // final PNG so the export matches the visible preview mode.
    const laidOutDocument: GraphicDocument = {
      ...sourceDocument,
      elements: sourceDocument.elements.map((element) => element.type === "text"
        ? withAutoTextHeight(element, resolveTextElement(element, previewMode, liveBindings))
        : element),
    };
    const rasterizedText = await rasterizeGraphicText(laidOutDocument, previewMode, liveBindings);
    const renderedSvg = graphicDocumentToSvg(laidOutDocument, { mode: previewMode, bindings: liveBindings, rasterizedText });
    const inlinedSvg = await inlineSvgImages(renderedSvg);
    const [{ initWasm, Resvg }, wasmModule] = await Promise.all([import("@resvg/resvg-wasm"), import("@resvg/resvg-wasm/index_bg.wasm?url")]);
    resvgInitialization ??= initWasm(fetch(wasmModule.default));
    await resvgInitialization;
    const renderer = new Resvg(inlinedSvg, { fitTo: { mode: "original" } });
    const png = renderer.render().asPng();
    renderer.free();
    const bytes = new Uint8Array(png);
    const url = URL.createObjectURL(new Blob([bytes.buffer], { type: "image/png" }));
    const anchor = globalThis.document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const downloadPng = async () => {
    setExporting(true);
    try {
      const filename = `${document.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "clashking-graphic"}.png`;
      await renderPng(document, filename);
      setStatus("PNG rendered locally");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "PNG export failed");
    } finally {
      setExporting(false);
    }
  };

  const downloadSelection = async (element: GraphicElement) => {
    const isolated = { ...structuredClone(element), x: 0, y: 0, rotation: 0 };
    const selectionDocument: GraphicDocument = { version: 1, name: element.name, canvas: { width: Math.ceil(element.width), height: Math.ceil(element.height), background: "transparent" }, elements: [isolated] };
    try { await renderPng(selectionDocument, `${element.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "selection"}.png`); }
    catch (error) { setStatus(error instanceof Error ? error.message : "Selection export failed"); }
  };

  const applyCanvasResize = (request: CanvasResizeRequest) => {
    runAction((current) => resizeCanvas(current, request.width, request.height, { elementMode: request.scaleElements ? "scale" : "clamp", minWidth: 100, minHeight: 100, maxWidth: 8000, maxHeight: 8000 }));
  };

  if (!projectsLoaded) return <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!activeProjectId) return <GraphicProjectHub projects={projects} onCreate={createProject} onOpen={openProject} onDelete={deleteProject} />;

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur-xl">
        <Button variant="ghost" size="icon" className="h-9 w-9" title="Back to graphics" onClick={() => { if (saveDraft()) setActiveProjectId(null); }}><ArrowLeft className="h-4 w-4" /></Button>
        <div className="min-w-0 flex-1">
          <Input value={document.name} onChange={(event) => commitDocument((current) => ({ ...current, name: event.target.value }))} aria-label="Graphic name" className="h-7 max-w-64 border-0 bg-transparent px-1 text-sm font-semibold shadow-none focus-visible:ring-0" />
          <p className="px-1 text-[11px] text-muted-foreground">{document.canvas.width} × {document.canvas.height}px</p>
        </div>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={undo} disabled={!history.past.length} title="Undo"><Undo2 /></Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={redo} disabled={!history.future.length} title="Redo"><Redo2 /></Button>
        <PreviewModeControl guildId={guildId} document={document} mode={previewMode} onMode={setPreviewMode} onBindings={setLiveBindings} onStatus={setStatus} />
        <Button variant="secondary" size="sm" className="hidden border-0 bg-muted/65 shadow-sm shadow-black/5 sm:flex" onClick={() => setResizeOpen(true)}><Maximize2 /> Resize</Button>
        <Button variant="secondary" size="sm" className="hidden border-0 bg-muted/65 shadow-sm shadow-black/5 md:flex" onClick={openJson}><FileJson /> JSON</Button>
        {status && <span className="hidden text-xs text-muted-foreground xl:block">{status}</span>}
        <Button variant="secondary" size="sm" className="hidden border-0 bg-muted/65 shadow-sm shadow-black/5 sm:flex" onClick={saveDraft}><Save /> Save</Button>
        <Button size="sm" onClick={() => void downloadPng()} disabled={exporting}>{exporting ? <Loader2 className="animate-spin" /> : <Download />}<span className="hidden sm:inline">Download</span></Button>
      </header>

      <div className="flex min-h-0 flex-1">
        <ToolRail activePanel={activePanel} onSelect={(panel) => { setActivePanel(panel); setPanelOpen(true); }} />
        {panelOpen && (
          <aside className="relative z-20 h-full w-[290px] shrink-0 border-r border-border bg-card/65 shadow-sm shadow-black/5">
            <div className="h-full overflow-y-auto overscroll-contain">
              {activePanel === "position" ? <PositionPanel
                document={document}
                selectedIds={selectedIds}
                tab={positionTab}
                onTabChange={setPositionTab}
                onSelectionChange={setSelectedIds}
                onAlign={alignCurrentSelection}
                onLayerAction={reorderCurrentSelection}
                onLayerDrop={reorderFromLayerDrop}
                onLockedChange={setCurrentSelectionLocked}
                onElementChange={updateElement}
              /> : <EditorPanelContent
                panel={activePanel}
                document={document}
                dynamicFields={dynamicFields}
                selected={selected}
                uploads={uploads}
                onAddAsset={addAsset}
                onAddDynamic={addDynamicField}
                onAddText={addText}
                onAddShape={addShape}
                onUpload={() => uploadRef.current?.click()}
                onBackgroundUpload={() => backgroundUploadRef.current?.click()}
                onCanvasChange={(canvas) => commitDocument((current) => ({ ...current, canvas }))}
                onElementChange={updateElement}
                onDeleteElement={(element) => deleteSelected(element)}
                onAddImageField={addDynamicField}
              />}
            </div>
            <Button variant="secondary" size="icon" className="absolute -right-4 top-1/2 z-30 h-8 w-8 -translate-y-1/2 rounded-full border-0 shadow-md" onClick={() => setPanelOpen(false)} aria-label="Close tools panel"><PanelLeftClose className="h-4 w-4" /></Button>
          </aside>
        )}

        <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-muted/25">
          {!panelOpen && <Button variant="secondary" size="icon" className="absolute left-3 top-3 z-30 h-9 w-9 rounded-full border-0 shadow-md" onClick={() => setPanelOpen(true)} aria-label="Open tools panel"><PanelLeftOpen /></Button>}
          <div className="flex h-[52px] shrink-0 items-center justify-center overflow-x-auto px-12 py-1.5">
            {selectedElements.length > 1 ? (
              <div role="toolbar" aria-label="Multiple element actions" className="flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-card/95 p-1.5 shadow-xl shadow-black/15">
                <span className="whitespace-nowrap px-2 text-xs font-semibold">{selectedElements.length} selected</span>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => openPositionPanel("arrange")}><Layers3 />Position</Button>
                <Button variant="ghost" size="sm" className="h-8" onClick={() => setCurrentSelectionLocked(!allSelectedLocked)}>{allSelectedLocked ? <Unlock /> : <Lock />}{allSelectedLocked ? "Unlock" : "Lock"}</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={deleteCurrentSelection} aria-label="Delete selected elements"><Trash2 className="h-4 w-4" /></Button>
              </div>
            ) : selected ? (
              <SelectionToolbar
                element={selected}
                fontFamilies={FONT_OPTIONS}
                onElementChange={updateElement}
                onPosition={() => openPositionPanel("arrange")}
                onFormatPainter={startFormatPainter}
                formatPainterActive={Boolean(formatPainterStyle)}
                onDuplicate={duplicateSelected}
                onDelete={deleteSelected}
              />
            ) : <span className="text-xs text-muted-foreground">Select an element to edit it</span>}
          </div>

          <div
            ref={canvasAreaRef}
            className={cn("relative min-h-0 flex-1 select-none overflow-hidden p-9", panTool && "cursor-grab", panning && "cursor-grabbing")}
            onPointerDown={(event) => {
              if (event.button === 1 || panTool) {
                event.preventDefault();
                setPanning({ x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y });
              }
            }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-25 [background-image:radial-gradient(circle_at_center,hsl(var(--muted-foreground))_0.7px,transparent_0.7px)] [background-size:18px_18px]" aria-hidden="true" />
            <CanvasContextMenu
              onEditBackground={() => { setActivePanel("background"); setPanelOpen(true); }}
              onRemoveBackground={() => commitDocument((current) => ({ ...current, canvas: { ...current.canvas, backgroundImage: undefined } }))}
            >
              <div
                className="absolute left-1/2 top-1/2 shrink-0 shadow-2xl shadow-black/25"
                style={{ width: document.canvas.width * scale, height: document.canvas.height * scale, transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px)` }}
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
              >
              <div
                className="absolute left-0 top-0 touch-none select-none overflow-hidden origin-top-left"
                style={{ width: document.canvas.width, height: document.canvas.height, transform: `scale(${scale})` }}
                onPointerDown={beginMarqueeSelection}
                onPointerMove={updateMarqueeSelection}
                onPointerUp={finishMarqueeSelection}
                onPointerCancel={finishMarqueeSelection}
                onDragStart={(event) => event.preventDefault()}
              >
                <div className="pointer-events-none absolute inset-0 [&>svg]:block [&>svg]:h-full [&>svg]:w-full" dangerouslySetInnerHTML={{ __html: svg }} />
                {marqueeRect && (
                  <div
                    className="pointer-events-none absolute bg-primary/15 ring-1 ring-primary"
                    style={{
                      left: marqueeRect.x,
                      top: marqueeRect.y,
                      width: marqueeRect.width,
                      height: marqueeRect.height,
                      boxShadow: `0 0 0 ${Math.max(1, 1 / scale)}px hsl(var(--primary) / 0.2)`,
                    }}
                    aria-hidden="true"
                  />
                )}
                {document.elements.map((element) => (
                  <EditorContextMenu
                    key={element.id}
                    element={element}
                    locked={Boolean(element.locked)}
                    onDuplicate={duplicateSelected}
                    onDelete={deleteSelected}
                    onLockedChange={(item, locked) => updateElement({ ...item, locked })}
                    onDownloadSelection={(item) => void downloadSelection(item)}
                    onSetAsBackground={setImageAsBackground}
                    onSelectGroup={(item) => setSelectedIds(selectElementGroup(document, item.id))}
                  >
                    <div
                      role="button"
                      tabIndex={0}
                      className={cn("absolute touch-none select-none outline-none", selectedIds.includes(element.id) ? "ring-[3px] ring-primary" : "hover:ring-2 hover:ring-white/70", element.locked ? "cursor-default" : panTool ? "cursor-grab" : "cursor-move")}
                      style={{ left: element.x, top: element.y, width: element.width, height: element.height, transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined }}
                      onPointerDown={(event) => beginInteraction(event, element, "move")}
                      onContextMenu={() => { if (!selectedIds.includes(element.id)) setSelectedId(element.id); }}
                      onDoubleClick={() => { setSelectedId(element.id); setActivePanel("properties"); setPanelOpen(true); }}
                      aria-label={`${element.locked ? "Select" : "Move"} ${element.name}`}
                    >
                      {selectedIds.length === 1 && selectedId === element.id && !element.locked && (
                        <>
                          {RESIZE_HANDLES.map((handle) => <button key={handle.id} type="button" aria-label={`Resize ${element.name} from ${handle.id}`} className="absolute rounded-full border-2 border-white bg-primary shadow-md" style={{ ...handle.style, width: 12 / scale, height: 12 / scale, borderWidth: Math.max(1, 2 / scale), cursor: handle.cursor }} onPointerDown={(event) => beginInteraction(event, element, "resize", handle.id)} />)}
                          <button type="button" aria-label={`Rotate ${element.name}`} className="absolute left-1/2 flex -translate-x-1/2 cursor-grab items-center justify-center rounded-full border-2 border-white bg-primary text-primary-foreground shadow-md" style={{ top: -38 / scale, width: 24 / scale, height: 24 / scale, borderWidth: Math.max(1, 2 / scale) }} onPointerDown={(event) => beginInteraction(event, element, "rotate")}><Redo2 style={{ width: 13 / scale, height: 13 / scale }} /></button>
                        </>
                      )}
                    </div>
                  </EditorContextMenu>
                ))}
              </div>
            </div>
            </CanvasContextMenu>
          </div>

          <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1 rounded-full bg-card/90 p-1 shadow-lg shadow-black/15 backdrop-blur">
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom((value) => Math.max(0.25, value - 0.1))} aria-label="Zoom out"><Minus /></Button>
            <Button variant={panTool ? "secondary" : "ghost"} size="icon" className="h-8 w-8 rounded-full" onClick={() => setPanTool((value) => !value)} aria-label="Pan canvas" title="Pan canvas"><Hand /></Button>
            <button type="button" className="min-w-14 text-xs font-semibold" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }} title="Fit and center canvas">{Math.round(scale * 100)}%</button>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => setZoom((value) => Math.min(3, value + 0.1))} aria-label="Zoom in"><Plus /></Button>
          </div>
        </main>
      </div>

      <input ref={uploadRef} type="file" accept="image/*" multiple className="hidden" onChange={(event) => { handleUploads(event.target.files); event.currentTarget.value = ""; }} />
      <input ref={backgroundUploadRef} type="file" accept="image/*" className="hidden" onChange={(event) => { handleUploads(event.target.files, true); event.currentTarget.value = ""; }} />
      <ResizeCanvasDialog open={resizeOpen} width={document.canvas.width} height={document.canvas.height} onOpenChange={setResizeOpen} onApply={applyCanvasResize} />
      <Dialog open={jsonOpen} onOpenChange={setJsonOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden border-0 bg-card shadow-xl">
          <DialogHeader><DialogTitle>Document JSON</DialogTitle><DialogDescription>This structured document is the source of truth for browser and worker rendering.</DialogDescription></DialogHeader>
          <textarea value={jsonDraft} onChange={(event) => setJsonDraft(event.target.value)} spellCheck={false} className="min-h-[52vh] w-full resize-none rounded-2xl bg-muted/55 p-4 font-mono text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          {jsonError && <p className="text-sm text-destructive">{jsonError}</p>}
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => setJsonOpen(false)}>Cancel</Button><Button onClick={applyJson}><Check /> Apply JSON</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const TOOL_ITEMS: readonly { id: EditorPanel; label: string; icon: typeof Images }[] = [
  { id: "clashking", label: "ClashKing", icon: Images },
  { id: "fankit", label: "Fan kit", icon: Sparkles },
  { id: "dynamic", label: "Dynamic", icon: Braces },
  { id: "text", label: "Text", icon: Type },
  { id: "shapes", label: "Shapes", icon: Shapes },
  { id: "uploads", label: "Uploads", icon: Upload },
  { id: "background", label: "Background", icon: PaintBucket },
  { id: "position", label: "Position", icon: Layers3 },
];

function ToolRail({ activePanel, onSelect }: { activePanel: EditorPanel; onSelect: (panel: EditorPanel) => void }) {
  return (
    <nav className="z-30 flex h-full w-[68px] shrink-0 flex-col items-center gap-1 border-r border-border bg-card px-1.5 py-2" aria-label="Graphic editor tools">
      {TOOL_ITEMS.map(({ id, label, icon: Icon }) => (
        <button key={id} type="button" onClick={() => onSelect(id)} className={cn("relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors", activePanel === id ? "bg-primary/10 text-primary shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
          {activePanel === id && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-primary" />}
          <Icon className="h-[18px] w-[18px]" />
          <span className="max-w-full truncate">{label}</span>
        </button>
      ))}
      <div className="mt-auto w-full">
        <button type="button" onClick={() => onSelect("properties")} className={cn("relative flex w-full flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-medium transition-colors", activePanel === "properties" ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground")}><Settings2 className="h-[18px] w-[18px]" />Properties</button>
      </div>
    </nav>
  );
}

function EditorPanelContent(props: {
  panel: EditorPanel;
  document: GraphicDocument;
  dynamicFields: readonly DynamicField[];
  selected: GraphicElement | null;
  uploads: LibraryAsset[];
  onAddAsset: (asset: LibraryAsset) => void;
  onAddDynamic: (field: DynamicField) => void;
  onAddText: (kind: "heading" | "subheading" | "body") => void;
  onAddShape: (preset: ShapePreset) => void;
  onUpload: () => void;
  onBackgroundUpload: () => void;
  onCanvasChange: (canvas: GraphicDocument["canvas"]) => void;
  onElementChange: (element: GraphicElement) => void;
  onDeleteElement: (element: GraphicElement) => void;
  onAddImageField: (field: DynamicField) => void;
}) {
  switch (props.panel) {
    case "clashking": return <AssetLibraryPanel sourceKind="clashking" title="ClashKing assets" onAdd={props.onAddAsset} />;
    case "fankit": return <AssetLibraryPanel sourceKind="supercell-fankit" title="Supercell fan kit" onAdd={props.onAddAsset} />;
    case "dynamic": return <DynamicPanel fields={props.dynamicFields} onAdd={props.onAddDynamic} />;
    case "text": return <TextPanel onAdd={props.onAddText} />;
    case "shapes": return <ShapesPanel onAdd={props.onAddShape} />;
    case "uploads": return <UploadsPanel assets={props.uploads} onUpload={props.onUpload} onAdd={props.onAddAsset} />;
    case "background": return <BackgroundPanel canvas={props.document.canvas} onChange={props.onCanvasChange} onUpload={props.onBackgroundUpload} />;
    case "properties": return props.selected
      ? <ElementPropertiesPanel element={props.selected} dynamicFields={props.dynamicFields} onChange={props.onElementChange} onAddImageField={props.onAddImageField} onDelete={() => props.onDeleteElement(props.selected!)} />
      : <div className="p-5 text-center text-sm text-muted-foreground">Select an element to edit its advanced settings.</div>;
  }
}

function AssetLibraryPanel({ sourceKind, title, onAdd }: { sourceKind: LibraryAssetSourceKind; title: string; onAdd: (asset: LibraryAsset) => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const infinite = sourceKind === "supercell-fankit";
  const { result, assets, loading, error, retry } = useAssetLibrary({ sourceKind, query, category: category === "all" ? "" : category, page, limit: infinite ? 50 : 25, debounceMs: 220, accumulate: infinite });

  useEffect(() => {
    const target = loadMoreRef.current;
    if (!infinite || !target || !result?.hasMore || loading) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setPage((current) => current + 1);
    }, { rootMargin: "240px" });
    observer.observe(target);
    return () => observer.disconnect();
  }, [infinite, loading, result?.hasMore, result?.page]);

  return (
    <div className="space-y-3 p-3">
      <div className="px-1"><h2 className="text-sm font-semibold">{title}</h2><p className="text-xs text-muted-foreground">Search, click, or drag onto the canvas.</p></div>
      <div className="flex items-center gap-2 rounded-xl bg-muted/55 px-3 shadow-sm shadow-black/5"><Search className="h-4 w-4 text-muted-foreground" /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder={`Search ${sourceKind === "clashking" ? "ClashKing" : "fan kit"}`} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>
      {sourceKind === "clashking" && result && result.categories.length > 0 && (
        <Select value={category} onValueChange={(value) => { setCategory(value); setPage(1); }}><SelectTrigger className="border-0 bg-muted/55 shadow-sm shadow-black/5"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{result.categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
      )}
      {error && <div className="rounded-2xl bg-destructive/10 p-3 text-xs text-destructive">{error}<Button variant="ghost" size="sm" className="mt-2 w-full" onClick={retry}>Try again</Button></div>}
      {loading && !result ? <div className="grid grid-cols-2 gap-2">{Array.from({ length: 8 }, (_, index) => <div key={index} className="h-28 animate-pulse rounded-xl bg-muted" />)}</div> : (
        <div className="grid grid-cols-2 gap-2">
          {assets.map((asset) => <AssetTile key={asset.id} asset={asset} onAdd={onAdd} />)}
        </div>
      )}
      {!loading && result?.assets.length === 0 && <div className="rounded-2xl bg-muted/40 p-5 text-center text-xs text-muted-foreground">No matching assets.</div>}
      {infinite ? <div ref={loadMoreRef} className="flex h-10 items-center justify-center text-xs text-muted-foreground">{loading && result ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Loading more</> : result?.hasMore ? "Scroll for more" : assets.length ? "All assets loaded" : null}</div> : result && (page > 1 || result.hasMore) && <div className="flex items-center justify-between"><Button variant="secondary" size="sm" className="border-0 bg-muted/65" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}><ChevronLeft />Previous</Button><span className="text-xs text-muted-foreground">Page {page}</span><Button variant="secondary" size="sm" className="border-0 bg-muted/65" disabled={!result.hasMore || loading} onClick={() => setPage((value) => value + 1)}>Next<ChevronRight /></Button></div>}
    </div>
  );
}

function AssetTile({ asset, onAdd }: { asset: LibraryAsset; onAdd: (asset: LibraryAsset) => void }) {
  return (
    <button type="button" draggable onDragStart={(event) => writeLibraryAssetDragData(event.dataTransfer, asset)} onClick={() => onAdd(asset)} className="group min-w-0 rounded-xl bg-muted/45 p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="relative mb-1.5 block h-24 overflow-hidden rounded-lg bg-background/60"><Image src={asset.thumbnail} alt="" fill unoptimized sizes="140px" className="object-contain p-1.5 transition-transform duration-150 group-hover:scale-105" /></span>
      <span className="block truncate text-[11px] font-medium">{asset.name}</span>
      <span className="block truncate text-[10px] text-muted-foreground">{asset.category}</span>
    </button>
  );
}

function DynamicPanel({ fields: availableFields, onAdd }: { fields: readonly DynamicField[]; onAdd: (field: DynamicField) => void }) {
  const [query, setQuery] = useState("");
  const fields = availableFields.filter((field) => `${field.label} ${field.key}`.toLowerCase().includes(query.toLowerCase()));
  return <div className="space-y-3 p-3"><div className="px-1"><h2 className="text-sm font-semibold">Dynamic fields</h2><p className="text-xs text-muted-foreground">Bindings resolve when ClashKing renders.</p></div><SearchBox value={query} onChange={setQuery} placeholder="Search fields" /><div className="space-y-1.5">{fields.map((field) => <button key={field.key} type="button" draggable onDragStart={(event) => event.dataTransfer.setData("application/x-clashking-graphic", `dynamic:${field.key}`)} onClick={() => onAdd(field)} className="flex w-full items-center gap-2.5 rounded-xl bg-muted/45 px-2.5 py-2 text-left hover:bg-muted"><span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", field.kind === "image" ? "bg-sky-500/12 text-sky-500" : "bg-primary/10 text-primary")}>{field.kind === "image" ? <ImageIcon className="h-4 w-4" /> : <Type className="h-4 w-4" />}</span><span className="min-w-0"><span className="block truncate text-xs font-medium">{field.label}</span><code className="block truncate text-[10px] text-muted-foreground">{bindingToken(field.key)}</code></span></button>)}</div></div>;
}

function TextPanel({ onAdd }: { onAdd: (kind: "heading" | "subheading" | "body") => void }) {
  return <div className="space-y-3 p-4"><div><h2 className="text-sm font-semibold">Text</h2><p className="text-xs text-muted-foreground">Add text, then style it from the canvas toolbar.</p></div><Button className="h-14 w-full justify-start text-xl" onClick={() => onAdd("heading")}><Plus />Add a heading</Button><Button variant="secondary" className="h-12 w-full justify-start border-0 bg-muted/65 text-base shadow-sm shadow-black/5" onClick={() => onAdd("subheading")}><Plus />Add a subheading</Button><Button variant="secondary" className="h-11 w-full justify-start border-0 bg-muted/65 font-normal shadow-sm shadow-black/5" onClick={() => onAdd("body")}><Plus />Add body text</Button><div className="rounded-2xl bg-muted/40 p-3 text-xs text-muted-foreground">Double-click a text element to edit its content and dynamic fallbacks.</div></div>;
}

function ShapesPanel({ onAdd }: { onAdd: (preset: ShapePreset) => void }) {
  return <div className="space-y-3 p-4"><div><h2 className="text-sm font-semibold">Shapes</h2><p className="text-xs text-muted-foreground">Add vector shapes that render consistently in preview and PNG.</p></div><div className="grid grid-cols-2 gap-2">{SHAPE_PRESETS.map((preset) => <button key={preset.id} type="button" onClick={() => onAdd(preset)} className="group rounded-2xl bg-muted/45 p-3 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="mb-3 flex h-20 items-center justify-center rounded-xl bg-background/55"><ShapePresetPreview preset={preset} /></span><span className="text-xs font-semibold">{preset.name}</span></button>)}</div></div>;
}

function ShapePresetPreview({ preset }: { preset: ShapePreset }) {
  if (preset.shape === "line" || preset.shape === "arrow") return <span className="relative block h-1.5 w-20 rounded-full bg-foreground">{preset.shape === "arrow" && <span className="absolute -right-1 -top-[5px] h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-foreground" />}</span>;
  return <span className={cn("block border-2 border-foreground/70 bg-primary/80", preset.shape === "ellipse" ? "h-14 w-16 rounded-full" : preset.id === "square" ? "h-14 w-14 rounded-xl" : "h-12 w-20 rounded-xl")} />;
}

function UploadsPanel({ assets, onUpload, onAdd }: { assets: LibraryAsset[]; onUpload: () => void; onAdd: (asset: LibraryAsset) => void }) {
  return <div className="space-y-3 p-3"><div className="px-1"><h2 className="text-sm font-semibold">Uploads</h2><p className="text-xs text-muted-foreground">Images stay inside the saved JSON document.</p></div><Button variant="secondary" className="w-full border-0 bg-muted/65 shadow-sm shadow-black/5" onClick={onUpload}><Upload />Upload images</Button>{assets.length ? <div className="grid grid-cols-2 gap-2">{assets.map((asset) => <AssetTile key={asset.id} asset={asset} onAdd={onAdd} />)}</div> : <div className="rounded-2xl bg-muted/40 p-5 text-center text-xs text-muted-foreground">Your uploaded images appear here.</div>}</div>;
}

function PreviewModeControl({ guildId, document, mode, onBindings, onMode, onStatus }: { guildId: string; document: GraphicDocument; mode: GraphicPreviewMode; onBindings: (bindings: BindingValues) => void; onMode: (mode: GraphicPreviewMode) => void; onStatus: (message: string) => void }) {
  const [open, setOpen] = useState(false);
  const [tag, setTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [clans, setClans] = useState<ServerClanListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const kind = document.kind ?? "player";

  useEffect(() => {
    if (!open || kind === "player" || !guildId) return;
    let active = true;
    void apiClient.servers.getServerClans(guildId).then((response) => {
      if (!active) return;
      setClans(response.data ?? []);
    });
    return () => { active = false; };
  }, [guildId, kind, open]);

  const load = async () => {
    if (!tag.trim()) return;
    setLoading(true);
    setError(null);
    const response = kind === "clan"
      ? await apiClient.clans.getClanInfo(tag.trim())
      : kind === "war"
        ? await apiClient.wars.getCurrentWar(tag.trim())
        : await apiClient.players.getPlayerInfo(tag.trim());
    setLoading(false);
    if (!response.data) {
      const message = response.error || `${kind} data could not be loaded`;
      setError(message);
      onStatus(message);
      return;
    }
    const payload = response.data as unknown as Record<string, unknown>;
    if (kind === "war") {
      const expectedSize = normalizeGraphicWarSize(document.warSize);
      const actualSize = typeof payload.teamSize === "number" ? payload.teamSize : undefined;
      if (actualSize !== undefined && actualSize !== expectedSize) {
        const message = `This is a ${actualSize}v${actualSize} war, but this graphic is configured for ${expectedSize}v${expectedSize}.`;
        setError(message);
        onStatus(message);
        return;
      }
    }
    onBindings(kind === "clan" ? mapClanApiData(payload) : kind === "war" ? mapWarApiData(payload, document.warSize) : mapPlayerApiData(payload));
    onMode("live");
    onStatus(`Showing live ${kind} data`);
    setOpen(false);
  };
  return <div className="flex items-center rounded-xl bg-muted/55 p-1 shadow-sm shadow-black/5" aria-label="Rendered data mode"><button type="button" className={cn("h-7 rounded-lg px-2 text-xs font-semibold", mode === "placeholder" ? "bg-card shadow-sm" : "text-muted-foreground")} onClick={() => onMode("placeholder")} title="Render placeholders"><EyeOff className="inline h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Placeholders</span></button><Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><button type="button" className={cn("h-7 rounded-lg px-2 text-xs font-semibold", mode === "live" ? "bg-card shadow-sm" : "text-muted-foreground")} title="Load live data"><Eye className="inline h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Live data</span></button></PopoverTrigger><PopoverContent align="end" className="w-80 space-y-3 rounded-2xl border-0 bg-popover p-4 shadow-2xl"><div><p className="text-sm font-semibold">Preview live {kind} data</p><p className="text-xs text-muted-foreground">Downloads use the data currently shown.</p></div>{kind !== "player" && clans.length > 0 && <Select value={tag} onValueChange={setTag}><SelectTrigger className="border-0 bg-muted/55"><SelectValue placeholder="Choose a linked clan" /></SelectTrigger><SelectContent>{clans.map((clan) => <SelectItem key={clan.tag} value={clan.tag}>{clan.name} · {clan.tag}</SelectItem>)}</SelectContent></Select>}<div className="flex gap-2"><Input value={tag} onChange={(event) => setTag(event.target.value)} onKeyDown={(event) => event.key === "Enter" && void load()} placeholder={kind === "player" ? "#PLAYER_TAG" : "#CLAN_TAG"} className="border-0 bg-muted/55 font-mono shadow-sm shadow-black/5" /><Button size="icon" onClick={() => void load()} disabled={loading || !tag.trim()} aria-label="Load live preview">{loading ? <Loader2 className="animate-spin" /> : <Eye />}</Button></div>{error && <p className="text-xs text-destructive">{error}</p>}</PopoverContent></Popover></div>;
}

function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (value: string) => void; placeholder: string }) {
  return <div className="flex items-center gap-2 rounded-xl bg-muted/55 px-3 shadow-sm shadow-black/5"><Search className="h-4 w-4 text-muted-foreground" /><input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="h-10 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground" /></div>;
}
