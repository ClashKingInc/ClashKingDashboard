import { describe, expect, it } from "vitest";

import { mergeRosterContextIds, removeAtomicMention, rosterMentionIds } from "./roster-mentions";

const rosters = [
  { id: "one", alias: "McClan One" },
  { id: "two", alias: "McClan Two" },
  { id: "three", alias: "McClan Three" },
];

describe("rosterMentionIds", () => {
  it("resolves every roster mentioned in a multi-roster prompt", () => {
    expect(rosterMentionIds(
      "look at @McClan One & @McClan Two, then put extras in @McClan Three",
      rosters,
    )).toEqual(["one", "two", "three"]);
  });

  it("matches aliases case-insensitively without accepting longer partial aliases", () => {
    expect(rosterMentionIds("use @mcclan two and ignore @McClan OneMore", rosters)).toEqual(["two"]);
  });
});

describe("mergeRosterContextIds", () => {
  it("keeps selected rosters when one of them is mentioned", () => {
    expect(mergeRosterContextIds(["one", "two", "alpha", "three"], ["alpha"])).toEqual([
      "one",
      "two",
      "alpha",
      "three",
    ]);
  });

  it("adds mentioned rosters that were not already selected", () => {
    expect(mergeRosterContextIds(["one", "two"], ["alpha", "two"])).toEqual(["one", "two", "alpha"]);
  });
});

describe("removeAtomicMention", () => {
  const mentions = [{ id: "player", label: "TH18 PaiN~Legend!" }];

  it("removes the entire mention when backspacing after its trailing space", () => {
    expect(removeAtomicMention("compare TH18 PaiN~Legend! ", 25, 25, "Backspace", mentions)).toEqual({
      text: "compare",
      caret: 7,
      removedIds: ["player"],
    });
  });

  it("removes the entire mention when backspacing from inside it", () => {
    expect(removeAtomicMention("TH18 PaiN~Legend! against Dylan", 8, 8, "Backspace", mentions)).toEqual({
      text: "against Dylan",
      caret: 0,
      removedIds: ["player"],
    });
  });

  it("leaves ordinary text editing alone", () => {
    expect(removeAtomicMention("compare TH18 PaiN~Legend!", 3, 3, "Backspace", mentions)).toBeNull();
  });
});
