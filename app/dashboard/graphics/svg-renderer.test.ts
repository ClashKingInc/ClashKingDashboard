import { describe, expect, it } from "vitest";
import { DEFAULT_GRAPHIC_DOCUMENT, type DynamicImageElement, type ShapeElement, type TextElement } from "./graphic-document";
import { mapClanApiData, mapPlayerApiData, mapWarApiData } from "./dynamic-fields";
import { graphicDocumentToSvg, resolveDynamicImage, resolveTextElement, validateGraphicDocument } from "./svg-renderer";

const textElement: TextElement = {
  id: "text",
  type: "text",
  name: "Text",
  x: 0,
  y: 0,
  width: 400,
  height: 80,
  rotation: 0,
  opacity: 1,
  content: "{player_name} · {player_clan}",
  color: "#ffffff",
  fontFamily: "Arial",
  fontSize: 32,
  fontWeight: 700,
  align: "left",
  lineHeight: 1.2,
  fallbacks: { player_clan: "No clan" },
};

const imageElement: DynamicImageElement = {
  id: "image",
  type: "dynamic-image",
  name: "League",
  x: 0,
  y: 0,
  width: 100,
  height: 100,
  rotation: 0,
  opacity: 1,
  binding: "player_league_icon",
  placeholder: "placeholder.png",
  fit: "contain",
  fallback: { behavior: "hide" },
};

const shapeElement: ShapeElement = {
  id: "shape",
  type: "shape",
  shape: "rectangle",
  name: "Rectangle",
  x: 10,
  y: 20,
  width: 180,
  height: 100,
  rotation: 0,
  opacity: 0.8,
  fillEnabled: true,
  fillColor: "#ff0000",
  strokeColor: "#ffffff",
  strokeWidth: 4,
  strokeDash: "dashed",
  cornerRadius: 18,
  arrowStart: "none",
  arrowEnd: "none",
};

describe("graphic SVG renderer", () => {
  it("resolves multiple text bindings and uses per-field fallbacks", () => {
    expect(resolveTextElement(textElement, "live", { player_name: "Ada", player_clan: null }))
      .toBe("Ada · No clan");
  });

  it("keeps editor rendering deterministic with field placeholders", () => {
    expect(resolveTextElement(textElement, "placeholder", {})).toContain("Chief Matthew");
    expect(resolveDynamicImage(imageElement, "placeholder", {})).toBe("placeholder.png");
  });

  it("applies dynamic-image fallback behavior without adding a second binding", () => {
    expect(resolveDynamicImage(imageElement, "live", {})).toBeNull();
    expect(resolveDynamicImage({ ...imageElement, fallback: { behavior: "image", source: "fallback.png" } }, "live", {}))
      .toBe("fallback.png");
  });

  it("generates an escaped standalone SVG from document JSON", () => {
    const document = structuredClone(DEFAULT_GRAPHIC_DOCUMENT);
    document.elements = [{ ...textElement, content: "Chief <script> & {player_name}" }];
    const svg = graphicDocumentToSvg(document, { mode: "live", bindings: { player_name: "A&B" } });

    expect(svg).toContain('viewBox="0 0 1200 630"');
    expect(svg).toContain("Chief &lt;script&gt; &amp; A&amp;B");
    expect(svg).not.toContain("<script>");
  });

  it("renders text outlines and can substitute browser-rasterized text for PNG export", () => {
    const document = structuredClone(DEFAULT_GRAPHIC_DOCUMENT);
    document.elements = [{ ...textElement, strokeColor: "#112233", strokeWidth: 4 }];
    const outlined = graphicDocumentToSvg(document);
    const rasterized = graphicDocumentToSvg(document, { rasterizedText: { text: "data:image/png;base64,abc" } });

    expect(outlined).toContain('stroke="#112233" stroke-width="4"');
    expect(rasterized).toContain('href="data:image/png;base64,abc"');
    expect(rasterized).not.toContain("<text");
  });

  it("rewrites official Clash API images through the asset proxy", () => {
    const document = structuredClone(DEFAULT_GRAPHIC_DOCUMENT);
    document.elements = [{ ...imageElement, placeholder: "https://api-assets.clashofclans.com/badges/512/example.png", fallback: { behavior: "placeholder" } }];
    expect(graphicDocumentToSvg(document)).toContain("https://assets-proxy.clashk.ing/badges/512/example.png");
  });

  it("renders editable vector rectangles and arrow endpoints", () => {
    const document = structuredClone(DEFAULT_GRAPHIC_DOCUMENT);
    document.elements = [shapeElement, { ...shapeElement, id: "arrow", shape: "arrow", fillEnabled: false, arrowEnd: "arrow" }];
    const svg = graphicDocumentToSvg(document);
    expect(svg).toContain('<rect data-element-id="shape"');
    expect(svg).toContain('rx="18"');
    expect(svg).toContain('stroke-dasharray="16 10"');
    expect(svg).toContain('marker-end="url(#shape-arrow-arrow)"');
  });

  it("accepts valid shape documents and rejects incomplete shapes", () => {
    const document = structuredClone(DEFAULT_GRAPHIC_DOCUMENT);
    document.elements = [shapeElement];
    expect(validateGraphicDocument(document)).toBe(true);
    expect(validateGraphicDocument({ ...document, elements: [{ ...shapeElement, strokeDash: "waves" }] })).toBe(false);
  });
});

describe("player preview mapping", () => {
  it("maps the official player response shape into renderer bindings", () => {
    const bindings = mapPlayerApiData({
      name: "Ada",
      tag: "#ABC",
      townHallLevel: 17,
      trophies: 6001,
      clan: { name: "ClashKing", tag: "#2PP", badgeUrls: { medium: "https://api-assets.clashofclans.com/badges/200/clan.png" } },
      leagueTier: { name: "Legend League", iconUrls: { medium: "https://api-assets.clashofclans.com/leagues/200/league.png" } },
    });

    expect(bindings).toMatchObject({
      player_name: "Ada",
      player_trophies: "6,001",
      player_clan: "ClashKing",
      player_clan_name: "ClashKing",
      player_clan_tag: "#2PP",
      player_clan_badge: "https://assets-proxy.clashk.ing/badges/200/clan.png",
      player_league_icon: "https://assets-proxy.clashk.ing/leagues/200/league.png",
    });
  });

  it("maps clan and war member collections into generated member bindings", () => {
    expect(mapClanApiData({
      name: "CK",
      memberList: [{ name: "Ada", townHallLevel: 17, trophies: 6000 }],
      badgeUrls: { large: "https://api-assets.clashofclans.com/badges/512/clan.png" },
    })).toMatchObject({
      clan_name: "CK",
      clan_member_1_name: "Ada",
      clan_member_1_townhall: 17,
      clan_badge: "https://assets-proxy.clashk.ing/badges/512/clan.png",
    });

    expect(mapWarApiData({
      clan: { name: "CK", stars: 12, members: [{ name: "Ada", townhallLevel: 17 }] },
      opponent: { name: "Away", stars: 10, members: [{ name: "Grace", townhallLevel: 16 }] },
    }, 5)).toMatchObject({
      war_clan_name: "CK",
      war_clan_member_1_name: "Ada",
      war_opponent_member_1_name: "Grace",
    });
  });
});
