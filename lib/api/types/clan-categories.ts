export interface ClanCategory {
  id: string;
  serverId: string;
  name: string;
  clanCount: number;
}

export interface ClanCategoriesResponse {
  items: ClanCategory[];
  total: number;
}

export interface ClanCategoryMutationResponse {
  category: ClanCategory;
}

export interface ClanCategoryDeletePreview {
  category: ClanCategory;
  affectedClanCount: number;
}

export interface ClanCategoryDeleteResponse {
  categoryId: string;
  name: string;
  deleted: true;
  uncategorizedClanCount: number;
}

export function isClanCategory(value: unknown): value is ClanCategory {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ClanCategory>;
  return typeof candidate.id === "string"
    && typeof candidate.serverId === "string"
    && typeof candidate.name === "string"
    && typeof candidate.clanCount === "number";
}

export function isClanCategoriesResponse(value: unknown): value is ClanCategoriesResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ClanCategoriesResponse>;
  return Array.isArray(candidate.items)
    && candidate.items.every(isClanCategory)
    && typeof candidate.total === "number";
}

export function isClanCategoryMutationResponse(
  value: unknown,
): value is ClanCategoryMutationResponse {
  if (!value || typeof value !== "object") return false;
  return isClanCategory((value as Partial<ClanCategoryMutationResponse>).category);
}

export function isClanCategoryDeletePreview(
  value: unknown,
): value is ClanCategoryDeletePreview {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ClanCategoryDeletePreview>;
  return isClanCategory(candidate.category)
    && typeof candidate.affectedClanCount === "number";
}

export function isClanCategoryDeleteResponse(
  value: unknown,
): value is ClanCategoryDeleteResponse {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<ClanCategoryDeleteResponse>;
  return typeof candidate.categoryId === "string"
    && typeof candidate.name === "string"
    && candidate.deleted === true
    && typeof candidate.uncategorizedClanCount === "number";
}
