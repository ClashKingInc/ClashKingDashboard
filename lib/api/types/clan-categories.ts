import {
  ClanCategoriesEndpoint,
  ClanCategoriesResponse as ClanCategoriesResponseSchema,
  ClanCategory as ClanCategorySchema,
  ClanCategoryDeletePreview as ClanCategoryDeletePreviewSchema,
  ClanCategoryDeleteResponse as ClanCategoryDeleteResponseSchema,
  ClanCategoryMutationResponse as ClanCategoryMutationResponseSchema,
  CreateClanCategoryEndpoint,
  DeleteClanCategoryEndpoint,
  PreviewClanCategoryDeleteEndpoint,
  type EndpointResponse,
} from "@clashking/api-contracts";
import { Schema } from "effect";

export type ClanCategory = (typeof ClanCategorySchema)["Type"];
export type ClanCategoriesResponse = EndpointResponse<typeof ClanCategoriesEndpoint>;
export type ClanCategoryMutationResponse = EndpointResponse<typeof CreateClanCategoryEndpoint>;
export type ClanCategoryDeletePreview = EndpointResponse<typeof PreviewClanCategoryDeleteEndpoint>;
export type ClanCategoryDeleteResponse = EndpointResponse<typeof DeleteClanCategoryEndpoint>;

export const isClanCategory = Schema.is(ClanCategorySchema);
export const isClanCategoriesResponse = Schema.is(ClanCategoriesResponseSchema);
export const isClanCategoryMutationResponse = Schema.is(ClanCategoryMutationResponseSchema);
export const isClanCategoryDeletePreview = Schema.is(ClanCategoryDeletePreviewSchema);

export function isClanCategoryDeleteResponse(value: unknown): value is ClanCategoryDeleteResponse {
  return Schema.is(ClanCategoryDeleteResponseSchema)(value) && value.deleted === true;
}
