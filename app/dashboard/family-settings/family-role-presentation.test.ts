import { describe, expect, it } from "vitest";

import { presentFamilyRoles } from "./family-role-presentation";

describe("presentFamilyRoles", () => {
  it("shows a deleted-role label without exposing the stale Discord ID", () => {
    const [role] = presentFamilyRoles(
      [{ id: "assignment-1", role_id: "105464653989046", mode: "both" }],
      [],
      "Deleted role",
    );

    expect(role.displayName).toBe("Deleted role");
    expect(role.displayName).not.toContain(role.role_id);
    expect(role.exists).toBe(false);
  });

  it("uses the current Discord role name when it still exists", () => {
    const [role] = presentFamilyRoles(
      [{ id: "assignment-1", role_id: "123", mode: "add" }],
      [{ id: "123", name: "fam elder", color: 0x99aab5 }],
      "Deleted role",
    );

    expect(role.displayName).toBe("@fam elder");
    expect(role.exists).toBe(true);
  });
});
