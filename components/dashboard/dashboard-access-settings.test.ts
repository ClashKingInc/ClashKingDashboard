import { serializeDashboardAccessGrants } from "./dashboard-access-settings";

describe("serializeDashboardAccessGrants", () => {
  it("produces a stable fingerprint regardless of grant order", () => {
    const first = [
      { role_id: "2", section: "roles" as const, access_level: "manage" as const },
      { role_id: "1", section: "settings" as const, access_level: "view" as const },
    ];
    const second = [...first].reverse();

    expect(serializeDashboardAccessGrants(first)).toBe(serializeDashboardAccessGrants(second));
  });
});
