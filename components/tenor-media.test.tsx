import { render, screen } from "@testing-library/react";

import { TenorMedia } from "./tenor-media";

describe("TenorMedia", () => {
  it("uses the original same-origin GET resolver without an authenticated API request", () => {
    render(
      <TenorMedia url="https://tenor.com/view/example-42?source=reminders" alt="Custom GIF" className="max-h-48 h-auto w-full object-contain" />,
    );

    const image = screen.getByRole("img", { name: "Custom GIF" });
    expect(image).toHaveAttribute("src", "/api/tenor-media?url=https%3A%2F%2Ftenor.com%2Fview%2Fexample-42%3Fsource%3Dreminders");
    expect(image).toHaveAttribute("width", "640");
    expect(image).toHaveAttribute("height", "360");
    expect(image).toHaveClass("max-h-48", "h-auto", "w-full", "object-contain");
  });
});
