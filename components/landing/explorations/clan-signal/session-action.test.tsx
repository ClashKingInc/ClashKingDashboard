import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const authState = vi.hoisted(() => ({ status: "anonymous" as "anonymous" | "authenticated" | "restoring" }));

vi.mock("@/components/auth-session-provider", () => ({
  useAuthSession: () => authState,
}));

import { LandingSessionAction } from "./session-action";

describe("LandingSessionAction", () => {
  beforeEach(() => {
    authState.status = "anonymous";
  });

  it("sends anonymous visitors to login", () => {
    render(<LandingSessionAction loginLabel="Log in" dashboardLabel="Dashboard" />);

    expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute("href", "/login");
  });

  it("sends authenticated visitors to their dashboard", () => {
    authState.status = "authenticated";
    render(<LandingSessionAction loginLabel="Log in" dashboardLabel="Dashboard" />);

    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/servers");
  });
});
