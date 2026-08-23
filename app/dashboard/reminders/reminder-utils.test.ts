import { describe, expect, it } from "vitest";

import { getStandaloneImageUrl, getStandaloneTenorUrl } from "./reminder-utils";

describe("getStandaloneImageUrl", () => {
  it.each([
    "https://cdn.example.com/reminder.png",
    "https://cdn.example.com/reminder.GIF?size=large",
    "https://media.example.com/asset?id=123&format=webp",
  ])("accepts a standalone image URL: %s", (message) => {
    expect(getStandaloneImageUrl(`  ${message}  `)).toBe(message);
  });

  it.each([
    "Remember to attack: https://cdn.example.com/reminder.png",
    "https://example.com/reminder",
    "javascript:alert(1).png",
    "",
    undefined,
  ])("leaves non-image messages as text: %s", (message) => {
    expect(getStandaloneImageUrl(message)).toBeNull();
  });
});

describe("getStandaloneTenorUrl", () => {
  it.each([
    "https://tenor.com/view/chicken-wake-up-gif-26345605",
    "https://www.tenor.com/view/don%E2%80%99t-make-me-beg-gif-18284150441593567102",
  ])("accepts a standalone Tenor share URL", (message) => {
    expect(getStandaloneTenorUrl(`  ${message}  `)).toBe(message);
  });

  it.each([
    "Use this GIF https://tenor.com/view/chicken-wake-up-gif-26345605",
    "https://example.com/view/chicken-wake-up-gif-26345605",
    "https://tenor.com/search/chicken-gifs",
  ])("rejects text and non-share URLs: %s", (message) => {
    expect(getStandaloneTenorUrl(message)).toBeNull();
  });
});
