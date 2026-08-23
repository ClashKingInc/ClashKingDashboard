import { canAccessDashboardPath } from "./dashboard-access-provider";

const delegatedCapabilities = {
  server_id: "1",
  full_access: false,
  sections: { panels: "view" as const },
};

describe("canAccessDashboardPath", () => {
  it("allows a legacy panels grant to reach the redirect route", () => {
    expect(canAccessDashboardPath(delegatedCapabilities, "/dashboard/panels")).toBe(true);
  });

  it("allows a legacy panels grant to use only the join-panel logs tab", () => {
    expect(canAccessDashboardPath(delegatedCapabilities, "/dashboard/logs", "join-panel")).toBe(true);
    expect(canAccessDashboardPath(delegatedCapabilities, "/dashboard/logs", "events")).toBe(false);
  });

  it("keeps full-access-only pages restricted", () => {
    expect(canAccessDashboardPath(delegatedCapabilities, "/dashboard/bases")).toBe(false);
  });
});
