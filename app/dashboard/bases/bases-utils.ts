export const BASES_PAGE_SIZE = 50;
export const MAX_BASE_IMAGES = 4;
export const MAX_BASE_DESCRIPTION_LENGTH = 1_000;

export interface BaseDraft {
  channelId: string;
  baseLink: string;
  description: string;
  images: File[];
}

export function baseDescriptionLength(value: string): number {
  return Array.from(value).length;
}

export type BaseDraftError =
  | "channelRequired"
  | "linkRequired"
  | "linkInvalid"
  | "descriptionTooLong"
  | "tooManyImages";

export function isValidBaseLayoutLink(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    const actions = url.searchParams.getAll("action");
    const ids = url.searchParams.getAll("id");

    return url.protocol === "https:"
      && url.hostname === "link.clashofclans.com"
      && url.pathname === "/en"
      && url.port === ""
      && url.username === ""
      && url.password === ""
      && url.hash === ""
      && [...url.searchParams.keys()].every((key) => key === "action" || key === "id")
      && actions.length === 1
      && actions[0] === "OpenLayout"
      && ids.length === 1
      && Boolean(ids[0]?.trim());
  } catch {
    return false;
  }
}

export function validateBaseDraft(draft: BaseDraft, retainedImageCount = 0): BaseDraftError | null {
  if (!draft.channelId.trim()) return "channelRequired";
  if (!draft.baseLink.trim()) return "linkRequired";
  if (!isValidBaseLayoutLink(draft.baseLink)) return "linkInvalid";
  if (baseDescriptionLength(draft.description) > MAX_BASE_DESCRIPTION_LENGTH) return "descriptionTooLong";
  if (retainedImageCount + draft.images.length > MAX_BASE_IMAGES) return "tooManyImages";
  return null;
}
