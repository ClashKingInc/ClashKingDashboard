import { describe, expect, it } from "vitest";

import { router } from "./router";

describe("application route inventory", () => {
  it("does not register the retired creator-review page", () => {
    const paths = Object.keys(router.routesByPath);

    expect(paths).not.toContain("/admin/creators");
    expect(paths).toContain("/login");
    expect(paths).toContain("/servers");
    expect(paths).toContain("/auth/callback");
  });
});
