import {
  BaseCreateFailure as BaseCreateFailureSchema,
  BaseDeleteFailure as BaseDeleteFailureSchema,
  BaseDownloaderEndpoint,
  BaseEndpoint,
  BasesEndpoint,
  CreateBaseEndpoint,
  DeleteBaseEndpoint,
  UploadBaseImageEndpoint,
  type EndpointRequest,
  type EndpointResponse,
} from "@clashking/api-contracts";
import { Schema } from "effect";

export type Base = EndpointResponse<typeof BaseEndpoint>;
export type BasesResponse = EndpointResponse<typeof BasesEndpoint>;
export type CreateBaseRequest = EndpointRequest<typeof CreateBaseEndpoint>["body"];
export type BaseImageUploadResponse = EndpointResponse<typeof UploadBaseImageEndpoint>;
export type BaseCreateFailure = (typeof BaseCreateFailureSchema)["Type"];
export type DiscordMessageCreateCleanup = BaseCreateFailure["discordMessageCleanup"];
export type BaseDownloader = EndpointResponse<typeof BaseDownloaderEndpoint>;
export type BaseDeleteResponse = EndpointResponse<typeof DeleteBaseEndpoint>;
export type BaseDeleteFailure = (typeof BaseDeleteFailureSchema)["Type"];
export type DiscordMessageCleanup = BaseDeleteResponse["discordMessageCleanup"];

export const isBaseCreateFailure = Schema.is(BaseCreateFailureSchema);
export const isBaseDeleteFailure = Schema.is(BaseDeleteFailureSchema);
