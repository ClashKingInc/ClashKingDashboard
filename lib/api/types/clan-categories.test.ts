import { describe, expect, it } from "vitest";
import {
  isClanCategoriesResponse,
  isClanCategoryDeletePreview,
  isClanCategoryDeleteResponse,
  isClanCategoryMutationResponse,
} from "./clan-categories";

const category = {
  id: "category-1",
  serverId: "123",
  name: "Competitive",
  clanCount: 2,
};

describe("clan category response guards", () => {
  it("accepts every exact camelCase response model", () => {
    expect(isClanCategoriesResponse({ items: [category], total: 1 })).toBe(true);
    expect(isClanCategoryMutationResponse({ category })).toBe(true);
    expect(isClanCategoryDeletePreview({
      category,
      affectedClanCount: 2,
    })).toBe(true);
    expect(isClanCategoryDeleteResponse({
      categoryId: category.id,
      name: category.name,
      deleted: true,
      uncategorizedClanCount: 3,
    })).toBe(true);
  });

  it("rejects stale snake_case and missing count models", () => {
    expect(isClanCategoriesResponse({
      items: [{ ...category, serverId: undefined, server_id: "123" }],
      total: 1,
    })).toBe(false);
    expect(isClanCategoryDeletePreview({ category })).toBe(false);
    expect(isClanCategoryDeleteResponse({
      category_id: category.id,
      deleted: true,
      uncategorized_clan_count: 2,
    })).toBe(false);
  });
});
