export type GraphicPreviewMode = "placeholder" | "live";
export type GraphicProjectKind = "player" | "clan" | "war";
export type GraphicWarSize = 2 | 3 | 5 | 10;

export function normalizeGraphicWarSize(value: number | undefined): GraphicWarSize {
  return value === 2 || value === 3 || value === 5 || value === 10 ? value : 5;
}

export interface GraphicCanvas {
  width: number;
  height: number;
  background: string;
  backgroundImage?: {
    source: string;
    fit: "contain" | "cover";
    opacity: number;
  };
}

export interface GraphicElementBase {
  id: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  locked?: boolean;
  flipX?: boolean;
  flipY?: boolean;
  /** Elements sharing a group can be selected and styled together. */
  groupId?: string;
}

export interface StaticImageElement extends GraphicElementBase {
  type: "image";
  source: string;
  fit: "contain" | "cover";
}

export interface DynamicImageElement extends GraphicElementBase {
  type: "dynamic-image";
  binding: string;
  placeholder: string;
  fit: "contain" | "cover";
  fallback: {
    behavior: "placeholder" | "hide" | "image";
    source?: string;
  };
}

export interface TextElement extends GraphicElementBase {
  type: "text";
  content: string;
  color: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  fontStyle?: "normal" | "italic";
  textDecoration?: "none" | "underline";
  strokeColor?: string;
  strokeWidth?: number;
  align: "left" | "center" | "right";
  lineHeight: number;
  fallbacks: Record<string, string>;
}

export type GraphicShapeKind = "rectangle" | "ellipse" | "line" | "arrow";
export type GraphicStrokeDash = "solid" | "dashed" | "dotted";
export type GraphicArrowEndpoint = "none" | "arrow";

export interface ShapeElement extends GraphicElementBase {
  type: "shape";
  shape: GraphicShapeKind;
  fillEnabled: boolean;
  fillColor: string;
  strokeColor: string;
  strokeWidth: number;
  strokeDash: GraphicStrokeDash;
  cornerRadius: number;
  arrowStart: GraphicArrowEndpoint;
  arrowEnd: GraphicArrowEndpoint;
}

export type GraphicElement = StaticImageElement | DynamicImageElement | TextElement | ShapeElement;

export interface GraphicDocument {
  version: 1;
  name: string;
  kind?: GraphicProjectKind;
  /** New war projects use GraphicWarSize. Kept numeric so legacy saved projects remain readable. */
  warSize?: number;
  canvas: GraphicCanvas;
  elements: GraphicElement[];
}

export type BindingValues = Record<string, string | number | null | undefined>;

let fallbackElementId = 0;

export function createElementId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return globalThis.crypto.randomUUID();
  fallbackElementId += 1;
  return `element-${Date.now()}-${fallbackElementId}`;
}

export const DEFAULT_GRAPHIC_DOCUMENT: GraphicDocument = {
  version: 1,
  name: "Player profile",
  kind: "player",
  canvas: { width: 1200, height: 630, background: "#111214" },
  elements: [
    {
      id: "profile-heading",
      type: "text",
      name: "Player heading",
      x: 72,
      y: 88,
      width: 780,
      height: 88,
      rotation: 0,
      opacity: 1,
      content: "{player_name}",
      color: "#ffffff",
      fontFamily: "Arial, sans-serif",
      fontSize: 64,
      fontWeight: 700,
      align: "left",
      lineHeight: 1.15,
      fallbacks: { player_name: "Unknown player" },
    },
    {
      id: "profile-details",
      type: "text",
      name: "Player details",
      x: 76,
      y: 198,
      width: 720,
      height: 120,
      rotation: 0,
      opacity: 1,
      content: "{player_tag}  ·  {player_clan_name}\n{player_trophies} trophies  ·  TH {player_townhall}",
      color: "#c8c9cc",
      fontFamily: "Arial, sans-serif",
      fontSize: 30,
      fontWeight: 500,
      align: "left",
      lineHeight: 1.45,
      fallbacks: { player_clan_name: "No clan" },
    },
    {
      id: "profile-league",
      type: "dynamic-image",
      name: "League icon",
      x: 870,
      y: 90,
      width: 250,
      height: 250,
      rotation: 0,
      opacity: 1,
      binding: "player_league_icon",
      placeholder: "https://assets.clashk.ing/leagues/league-tier/legend_league.png",
      fit: "contain",
      fallback: { behavior: "placeholder" },
    },
    {
      id: "profile-brand",
      type: "image",
      name: "ClashKing mark",
      x: 76,
      y: 492,
      width: 250,
      height: 72,
      rotation: 0,
      opacity: 0.92,
      source: "https://assets.clashk.ing/logos/crown-text-dark-bg/ClashKing-with-text-3.svg",
      fit: "contain",
    },
  ],
};
