import { describe, expect, it } from "vitest";
import { createGraphicDocument, createGraphicProject, parseGraphicProjects, WAR_SIZES } from "./graphic-projects";

describe("graphic project templates", () => {
  it("offers only the supported compact war sizes", () => {
    expect(WAR_SIZES).toEqual([2, 3, 5, 10]);
  });

  it("creates a clan overview without indexed member elements", () => {
    const document = createGraphicDocument("clan");
    const members = document.elements.filter((element) => element.groupId === "clan-members");
    expect(document.kind).toBe("clan");
    expect(members).toHaveLength(0);
    expect(document.elements).toHaveLength(3);
    expect(document.canvas).toMatchObject({ width: 1600, height: 900 });
  });

  it.each([2, 3, 5, 10])("creates both grouped rosters for a %iv%i war", (warSize) => {
    const document = createGraphicDocument("war", warSize);
    expect(document.warSize).toBe(warSize);
    expect(document.elements.filter((element) => element.groupId === "war-clan-members")).toHaveLength(warSize);
    expect(document.elements.filter((element) => element.groupId === "war-opponent-members")).toHaveLength(warSize);
  });

  it("falls back to 5v5 when a caller requests an unsupported war size", () => {
    const document = createGraphicDocument("war", 30);
    expect(document.warSize).toBe(5);
    expect(document.elements.filter((element) => element.groupId === "war-clan-members")).toHaveLength(5);
    expect(document.elements.filter((element) => element.groupId === "war-opponent-members")).toHaveLength(5);
  });

  it("parses project collections without accepting unrelated values", () => {
    const project = createGraphicProject("player");
    expect(parseGraphicProjects([project, null, { nope: true }])).toEqual([project]);
  });

  it("keeps legacy war projects readable without offering their old size for new projects", () => {
    const project = createGraphicProject("war", 5);
    const legacy = { ...project, document: { ...project.document, warSize: 30 } };
    expect(parseGraphicProjects([legacy])).toEqual([legacy]);
  });
});
