import { describe, expect, it } from "vitest";

import {
  filterPlaceholders,
  getPlaceholderQuery,
  insertPlaceholder,
  type PlaceholderOption,
} from "./nickname-format";

const placeholders: PlaceholderOption[] = [
  { key: "{player_name}", description: "Player name", example: "Chief" },
  { key: "{player_tag}", description: "Player tag", example: "#2PP" },
  { key: "{discord_name}", description: "Discord name", example: "Chief#1234" },
];

describe("nickname placeholder autocomplete", () => {
  it("finds the unfinished placeholder at the caret", () => {
    expect(getPlaceholderQuery("[Clan] {player", 14)).toEqual({
      start: 7,
      end: 14,
      query: "player",
    });
  });

  it("does not open inside completed placeholders or ordinary text", () => {
    expect(getPlaceholderQuery("{player_name}", 13)).toBeNull();
    expect(getPlaceholderQuery("Chief name", 10)).toBeNull();
  });

  it("filters by the text after the opening brace", () => {
    expect(filterPlaceholders(placeholders, "player").map((item) => item.key)).toEqual([
      "{player_name}",
      "{player_tag}",
    ]);
  });

  it("replaces the unfinished token and returns the new caret", () => {
    expect(
      insertPlaceholder("[Clan] {play suffix", { start: 7, end: 12, query: "play" }, "{player_name}"),
    ).toEqual({ value: "[Clan] {player_name} suffix", caret: 20 });
  });
});
