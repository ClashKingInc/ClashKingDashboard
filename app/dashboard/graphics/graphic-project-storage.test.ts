import { describe, expect, it, vi } from "vitest";
import {
  embeddedImageValidationError,
  MAX_EMBEDDED_IMAGE_BYTES,
  storeGraphicProjects,
} from "./graphic-project-storage";

describe("embeddedImageValidationError", () => {
  it("accepts images within the browser-storage budget", () => {
    expect(embeddedImageValidationError({ type: "image/png", size: MAX_EMBEDDED_IMAGE_BYTES })).toBeNull();
  });

  it("rejects oversized and non-image files", () => {
    expect(embeddedImageValidationError({ type: "image/png", size: MAX_EMBEDDED_IMAGE_BYTES + 1 })).toContain("2 MB");
    expect(embeddedImageValidationError({ type: "text/plain", size: 10 })).toContain("image file");
  });
});

describe("storeGraphicProjects", () => {
  it("serializes projects into the requested storage key", () => {
    const setItem = vi.fn();
    expect(storeGraphicProjects({ setItem }, "graphic-projects:guild", [])).toBeNull();
    expect(setItem).toHaveBeenCalledWith("graphic-projects:guild", "[]");
  });

  it("returns an actionable message when browser storage is full", () => {
    const storage = {
      setItem: () => { throw new DOMException("full", "QuotaExceededError"); },
    };
    expect(storeGraphicProjects(storage, "graphic-projects:guild", [])).toContain("storage is full");
  });

  it("contains unexpected storage failures", () => {
    const storage = { setItem: () => { throw new Error("storage unavailable"); } };
    expect(storeGraphicProjects(storage, "graphic-projects:guild", [])).toContain("could not be saved");
  });
});
