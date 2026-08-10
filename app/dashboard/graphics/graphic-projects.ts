import {
  createElementId,
  DEFAULT_GRAPHIC_DOCUMENT,
  normalizeGraphicWarSize,
  type GraphicDocument,
  type GraphicProjectKind,
  type GraphicWarSize,
  type TextElement,
} from "./graphic-document";
import { validateGraphicDocument } from "./svg-renderer";

export const WAR_SIZES = [2, 3, 5, 10] as const satisfies readonly GraphicWarSize[];
export const DEFAULT_WAR_SIZE: GraphicWarSize = 5;

export interface GraphicProjectRecord {
  id: string;
  kind: GraphicProjectKind;
  updatedAt: string;
  document: GraphicDocument;
}

export const GRAPHIC_PROJECT_TYPES: readonly {
  kind: GraphicProjectKind;
  label: string;
  description: string;
}[] = [
  { kind: "player", label: "Player", description: "A profile, achievement, or recruitment graphic for one player." },
  { kind: "clan", label: "Clan", description: "A clan overview without a fixed member roster." },
  { kind: "war", label: "War", description: "A matchup graphic for a 2v2, 3v3, 5v5, or 10v10 war." },
];

function textElement(input: Partial<TextElement> & Pick<TextElement, "name" | "content" | "x" | "y" | "width" | "height">): TextElement {
  return {
    id: createElementId(),
    type: "text",
    rotation: 0,
    opacity: 1,
    color: "#ffffff",
    fontFamily: "'Inter', sans-serif",
    fontSize: 28,
    fontWeight: 600,
    fontStyle: "normal",
    textDecoration: "none",
    align: "left",
    lineHeight: 1.2,
    fallbacks: {},
    ...input,
  };
}

function createClanDocument(): GraphicDocument {
  const elements: GraphicDocument["elements"] = [
    textElement({ name: "Clan name", content: "{clan_name}", x: 96, y: 72, width: 1080, height: 96, fontSize: 64, fontWeight: 800, fallbacks: { clan_name: "ClashKing" } }),
    textElement({ name: "Clan details", content: "{clan_tag} · Level {clan_level} · {clan_members} members", x: 100, y: 168, width: 1100, height: 58, fontSize: 28, color: "#c8c9cc", fallbacks: { clan_tag: "#2PP", clan_level: "25", clan_members: "50" } }),
    { id: createElementId(), type: "dynamic-image", name: "Clan badge", x: 1320, y: 55, width: 180, height: 180, rotation: 0, opacity: 1, binding: "clan_badge", placeholder: "https://assets.clashk.ing/icons/Icon_HV_Shield.png", fit: "contain", fallback: { behavior: "placeholder" } },
  ];
  return { version: 1, kind: "clan", name: "Clan overview", canvas: { width: 1600, height: 900, background: "#111214" }, elements };
}

function createWarDocument(warSize: number): GraphicDocument {
  const safeSize = normalizeGraphicWarSize(warSize);
  const height = Math.max(900, 350 + safeSize * 58);
  const elements: GraphicDocument["elements"] = [
    textElement({ name: "War title", content: "{war_clan_name} vs {war_opponent_name}", x: 100, y: 60, width: 1400, height: 90, align: "center", fontSize: 60, fontWeight: 800, fallbacks: { war_clan_name: "ClashKing", war_opponent_name: "Opponent" } }),
    textElement({ name: "War score", content: "{war_clan_stars} ★  —  ★ {war_opponent_stars}", x: 100, y: 150, width: 1400, height: 72, align: "center", fontSize: 42, fallbacks: { war_clan_stars: "36", war_opponent_stars: "34" } }),
    { id: createElementId(), type: "dynamic-image", name: "War clan badge", x: 110, y: 48, width: 150, height: 150, rotation: 0, opacity: 1, binding: "war_clan_badge", placeholder: "https://assets.clashk.ing/icons/Icon_HV_Shield.png", fit: "contain", fallback: { behavior: "placeholder" } },
    { id: createElementId(), type: "dynamic-image", name: "Opponent badge", x: 1340, y: 48, width: 150, height: 150, rotation: 0, opacity: 1, binding: "war_opponent_badge", placeholder: "https://assets.clashk.ing/icons/Icon_HV_Shield_Arrow.png", fit: "contain", fallback: { behavior: "placeholder" } },
  ];

  for (let index = 0; index < safeSize; index += 1) {
    const memberNumber = index + 1;
    for (const side of ["clan", "opponent"] as const) {
      const key = `war_${side}_member_${memberNumber}`;
      const x = side === "clan" ? 110 : 850;
      elements.push(textElement({
        name: `${side === "clan" ? "Clan" : "Opponent"} member ${memberNumber}`,
        content: `${memberNumber}. {${key}_name} · TH {${key}_townhall}`,
        x,
        y: 270 + index * 58,
        width: 640,
        height: 44,
        fontSize: 22,
        groupId: `war-${side}-members`,
        fallbacks: { [`${key}_name`]: `${side === "clan" ? "Home" : "Away"} ${memberNumber}`, [`${key}_townhall`]: "17" },
      }));
    }
  }

  return { version: 1, kind: "war", warSize: safeSize, name: `${safeSize}v${safeSize} war`, canvas: { width: 1600, height, background: "#111214" }, elements };
}

export function createGraphicDocument(kind: GraphicProjectKind, warSize: number = DEFAULT_WAR_SIZE): GraphicDocument {
  if (kind === "clan") return createClanDocument();
  if (kind === "war") return createWarDocument(warSize);
  return { ...structuredClone(DEFAULT_GRAPHIC_DOCUMENT), kind: "player", name: "Player profile" };
}

export function createGraphicProject(kind: GraphicProjectKind, warSize: number = DEFAULT_WAR_SIZE): GraphicProjectRecord {
  return { id: createElementId(), kind, updatedAt: new Date().toISOString(), document: createGraphicDocument(kind, warSize) };
}

export function parseGraphicProjects(value: unknown): GraphicProjectRecord[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is GraphicProjectRecord => {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<GraphicProjectRecord>;
    return typeof candidate.id === "string"
      && typeof candidate.updatedAt === "string"
      && ["player", "clan", "war"].includes(candidate.kind ?? "")
      && validateGraphicDocument(candidate.document);
  });
}
