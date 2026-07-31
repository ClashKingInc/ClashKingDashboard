export const BASES_PAGE_SIZE = 50;
export const MAX_BASE_IMAGES = 4;
export const MAX_BASE_DESCRIPTION_LENGTH = 1_000;

export interface BaseDraft {
  channelId: string;
  baseLink: string;
  description: string;
  images: File[];
}

export type BaseDraftError =
  | "channelRequired"
  | "linkRequired"
  | "descriptionTooLong"
  | "tooManyImages";

export function validateBaseDraft(draft: BaseDraft): BaseDraftError | null {
  if (!draft.channelId.trim()) return "channelRequired";
  if (!draft.baseLink.trim()) return "linkRequired";
  if (draft.description.length > MAX_BASE_DESCRIPTION_LENGTH) return "descriptionTooLong";
  if (draft.images.length > MAX_BASE_IMAGES) return "tooManyImages";
  return null;
}
