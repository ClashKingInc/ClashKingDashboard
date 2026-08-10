import { dashboardNavigationSections } from "./dashboard-navigation";

describe("dashboardNavigationSections", () => {
  it("keeps the first navigation group unlabeled and server automation under Server Management", () => {
    const firstSection = dashboardNavigationSections[0];
    const sectionPaths = Object.fromEntries(
      dashboardNavigationSections.map((section) => [
        section.titleKey,
        section.items.map((item) => item.path),
      ]),
    );

    expect(firstSection.titleKey).toBeNull();
    expect(firstSection.items.map((item) => item.path)).toEqual([
      "general",
      "family-settings",
      "logs",
      "roles",
      "reminders",
      "autoboards",
    ]);
    expect(sectionPaths["sections.serverManagement"]).toEqual([
      "giveaways",
      "tickets",
      "embeds",
      "graphics",
    ]);
  });

  it("keeps dashboard access inside General Settings instead of a separate route", () => {
    const paths = dashboardNavigationSections.flatMap((section) => section.items.map((item) => item.path));

    expect(paths).not.toContain("dashboard-access");
    expect(paths).not.toContain("panels");
    expect(paths).toContain("general");
  });

  it("does not expose the retired overview page", () => {
    const paths = dashboardNavigationSections.flatMap((section) => section.items.map((item) => item.path));

    expect(paths).not.toContain("");
  });

  it("marks the graphics editor as desktop-only", () => {
    const graphics = dashboardNavigationSections
      .flatMap((section) => section.items)
      .find((item) => item.path === "graphics");

    expect(graphics?.desktopOnly).toBe(true);
  });
});
