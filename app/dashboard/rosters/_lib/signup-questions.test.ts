import { describe, expect, it } from "vitest";
import type { RosterSignupQuestion } from "@/lib/api/types/roster";
import { hasInvalidDropdownOptions } from "./signup-questions";

const dropdown: RosterSignupQuestion = {
  id: "destination", label: "Which clan?", type: "single_select", required: true, options: ["One"], order: 0,
};

describe("hasInvalidDropdownOptions", () => {
  it("rejects empty and whitespace-only dropdown options", () => {
    expect(hasInvalidDropdownOptions([{ ...dropdown, options: [] }])).toBe(true);
    expect(hasInvalidDropdownOptions([{ ...dropdown, options: ["One", "  "] }])).toBe(true);
    expect(hasInvalidDropdownOptions([{ ...dropdown, options: ["One", "Two"] }])).toBe(false);
  });

  it("does not reject questions without dropdown options", () => {
    expect(hasInvalidDropdownOptions([{ ...dropdown, type: "text", options: [] }])).toBe(false);
  });
});
