import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const history = {
  back: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
};
const router = {
  history,
  invalidate: vi.fn(),
  preloadRoute: vi.fn(),
};
let locationState = { pathname: "/dashboard/roles", searchStr: "guildId=123&tab=family" };

vi.mock("@tanstack/react-router", () => ({
  useLocation: ({ select }: { select: (location: typeof locationState) => unknown }) => select(locationState),
  useRouter: () => router,
}));

import { usePathname, useRouter, useSearchParams } from "./navigation";

describe("navigation compatibility hooks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    locationState = { pathname: "/dashboard/roles", searchStr: "guildId=123&tab=family" };
  });

  it("projects the router location into pathname and URLSearchParams values", () => {
    expect(renderHook(() => usePathname()).result.current).toBe("/dashboard/roles");
    const search = renderHook(() => useSearchParams()).result.current;
    expect(search.get("guildId")).toBe("123");
    expect(search.get("tab")).toBe("family");
  });

  it("forwards same-host navigation and lifecycle actions to TanStack Router", () => {
    const { result } = renderHook(() => useRouter());

    act(() => {
      result.current.back();
      result.current.push("/servers");
      result.current.replace("/login");
      result.current.refresh();
      result.current.prefetch("/dashboard/general");
    });

    expect(history.back).toHaveBeenCalledOnce();
    expect(history.push).toHaveBeenCalledWith("/servers");
    expect(history.replace).toHaveBeenCalledWith("/login");
    expect(router.invalidate).toHaveBeenCalledOnce();
    expect(router.preloadRoute).toHaveBeenCalledWith({ to: "/dashboard/general" });
  });
});
