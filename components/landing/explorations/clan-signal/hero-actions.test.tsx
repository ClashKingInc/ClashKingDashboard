import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HeroActions } from "./hero-actions";

describe("HeroActions", () => {
  it("pre-renders both store destinations so platform CSS can select one before paint", () => {
    render(
      <HeroActions
        mobileAppLabel="Mobile App"
        iosLabel="iOS app"
        androidLabel="Android app"
        discordLabel="Add Discord bot"
      />,
    );

    const iosLink = screen.getByRole("link", { name: /iOS app/ });
    const androidLink = screen.getByRole("link", { name: /Android app/ });
    const discordLinks = screen.getAllByRole("link", { name: /Add Discord bot/ });

    expect(iosLink).toHaveAttribute("href", expect.stringContaining("testflight.apple.com"));
    expect(androidLink).toHaveAttribute("href", expect.stringContaining("play.google.com"));
    expect(iosLink).toHaveClass("is-primary");
    expect(androidLink).toHaveClass("is-primary");
    expect(discordLinks).toHaveLength(2);
    discordLinks.forEach((link) => expect(link).not.toHaveClass("is-primary"));
  });
});
