import { describe, expect, it } from "vitest";

import baseline from "../docs/dashboard-page-baseline.json";
import DashboardRouteLoading from "../app/dashboard/loading";
import GiveawaysLoadingPage from "../app/dashboard/giveaways/loading";
import { router } from "./router";

describe("application route inventory", () => {
  const approvedRemovals = new Set(baseline.approvedRemovals.map(({ path }) => path));
  const unresolved = new Set(baseline.unresolved.map(({ path }) => path));
  const required = baseline.pages.filter(({ path }) => !approvedRemovals.has(path) && !unresolved.has(path));

  it.each(required)("retains the current main page $path", ({ path }) => {
    expect(Object.keys(router.routesByPath)).toContain(path);
  });

  it("keeps explicitly retired pages out of the required inventory", () => {
    expect([...approvedRemovals]).toEqual([
      "/connect",
      "/admin/creators",
      "/support-us",
      "/dashboard/support-us",
    ]);
    expect(Object.keys(router.routesByPath)).not.toContain("/connect");
    expect(Object.keys(router.routesByPath)).not.toContain("/admin/creators");
    expect(Object.keys(router.routesByPath)).not.toContain("/support-us");
    expect(Object.keys(router.routesByPath)).not.toContain("/dashboard/support-us");
    expect(required.map(({ path }) => path)).toEqual(expect.arrayContaining(["/login", "/servers", "/auth/callback"]));
  });

  it("records creator review as retired even though current main still contains the old page", () => {
    expect([...unresolved]).toEqual([]);
    expect(baseline.pages.map(({ path }) => path)).toContain("/admin/creators");
    expect(approvedRemovals.has("/admin/creators")).toBe(true);
  });

  it("uses the fetched main page inventory without resurrecting its removed connected-app page", () => {
    expect(baseline.baseline.branch).toBe("main");
    expect(baseline.baseline.repositoryUrl).toBe("https://github.com/ClashKingInc/ClashKingDashboard.git");
    expect(baseline.pages).toHaveLength(47);
    expect(required).toHaveLength(44);
    expect(baseline.pages.map(({ path }) => path)).not.toContain("/connect");
  });

  it("retains both original route loading screens while page code loads", () => {
    expect(router.routesByPath["/dashboard/giveaways"].options.pendingComponent).toBe(GiveawaysLoadingPage);
    expect(router.routesByPath["/dashboard/roles"].options.pendingComponent).toBe(DashboardRouteLoading);
    expect(router.routesByPath["/dashboard"].options.pendingComponent).toBe(DashboardRouteLoading);
  });
});
