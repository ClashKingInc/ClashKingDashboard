import { describe, expect, it } from "vitest";
import {
  MAX_BASE_DESCRIPTION_LENGTH,
  MAX_BASE_IMAGES,
  validateBaseDraft,
} from "./bases-utils";
import { isBaseCreateFailure, isBaseDeleteFailure } from "@/lib/api/types/bases";

function draft(overrides: Partial<Parameters<typeof validateBaseDraft>[0]> = {}) {
  return {
    channelId: "123",
    baseLink: "https://link.clashofclans.com/en?action=OpenLayout&id=TH16",
    description: "Anti-three-star layout",
    images: [],
    ...overrides,
  };
}

describe("validateBaseDraft", () => {
  it("requires a selected channel and layout link", () => {
    expect(validateBaseDraft(draft({ channelId: " " }))).toBe("channelRequired");
    expect(validateBaseDraft(draft({ baseLink: "" }))).toBe("linkRequired");
  });

  it("enforces the description and image limits", () => {
    expect(validateBaseDraft(draft({
      description: "x".repeat(MAX_BASE_DESCRIPTION_LENGTH + 1),
    }))).toBe("descriptionTooLong");
    expect(validateBaseDraft(draft({
      images: Array.from({ length: MAX_BASE_IMAGES + 1 }, (_, index) =>
        new File(["image"], `base-${index}.webp`)),
    }))).toBe("tooManyImages");
  });

  it("does not accept or initialize engagement counters", () => {
    expect(validateBaseDraft(draft())).toBeNull();
    expect(draft()).not.toHaveProperty("downloadCount");
    expect(draft()).not.toHaveProperty("upvotes");
    expect(draft()).not.toHaveProperty("downvotes");
  });
});

describe("isBaseDeleteFailure", () => {
  it("recognizes structured fail-closed cleanup results", () => {
    expect(isBaseDeleteFailure({
      code: "discord_unavailable",
      message: "Discord integration unavailable",
      requestId: "request-1",
      baseId: "base-1",
      databaseDeleted: false,
      discordMessageCleanup: "failed",
      retryable: true,
    })).toBe(true);
  });

  it("does not misclassify a normal 404 error", () => {
    expect(isBaseDeleteFailure({ message: "Base not found" })).toBe(false);
  });
});

describe("isBaseCreateFailure", () => {
  it("recognizes the camelCase structured creation failure", () => {
    expect(isBaseCreateFailure({
      code: "database_insert_failed",
      message: "Database insert failed",
      requestId: "request-2",
      databaseInserted: false,
      discordMessageCreated: true,
      discordMessageId: "message-2",
      discordMessageCleanup: "failed",
      retryable: false,
    })).toBe(true);
  });

  it("does not misclassify a generic validation error", () => {
    expect(isBaseCreateFailure({
      code: "validation_error",
      message: "Invalid request",
      requestId: "request-3",
    })).toBe(false);
  });
});
