import { describe, expect, it } from "vitest";

import { rosterAssistantErrorText } from "./roster-assistant-error";

describe("rosterAssistantErrorText", () => {
  it("extracts an API error instead of exposing raw JSON", () => {
    expect(rosterAssistantErrorText(new Error('{"error":"This server has used its monthly roster AI budget"}')))
      .toBe("This server has used its monthly roster AI budget");
  });

  it("preserves an already readable error", () => {
    expect(rosterAssistantErrorText(new Error("The assistant connection was interrupted.")))
      .toBe("The assistant connection was interrupted.");
  });

  it("provides a useful fallback", () => {
    expect(rosterAssistantErrorText(undefined)).toContain("couldn’t complete");
  });
});
