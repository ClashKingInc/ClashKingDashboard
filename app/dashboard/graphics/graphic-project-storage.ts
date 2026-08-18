import type { GraphicProjectRecord } from "./graphic-projects";

export const MAX_EMBEDDED_IMAGE_BYTES = 2 * 1024 * 1024;

export function embeddedImageValidationError(file: Pick<File, "size" | "type">): string | null {
  if (!file.type.startsWith("image/")) return "Choose an image file.";
  if (file.size > MAX_EMBEDDED_IMAGE_BYTES) return "Images must be 2 MB or smaller.";
  return null;
}

export function storeGraphicProjects(
  storage: Pick<Storage, "setItem">,
  key: string,
  projects: readonly GraphicProjectRecord[],
): string | null {
  try {
    storage.setItem(key, JSON.stringify(projects));
    return null;
  } catch (error) {
    if (error instanceof DOMException && (
      error.name === "QuotaExceededError"
      || error.name === "NS_ERROR_DOM_QUOTA_REACHED"
    )) {
      return "Browser storage is full. Remove an uploaded image or delete an older graphic, then try again.";
    }
    return "This graphic could not be saved in your browser.";
  }
}
