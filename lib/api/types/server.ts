/**
 * Compatibility aliases for the shared server and guild API contracts.
 */

import {
  AddServerBanEndpoint,
  AddServerStrikeEndpoint,
  BanRequest as BanRequestSchema,
  BannedPlayer as BannedPlayerSchema,
  ClanSettingsEndpoint,
  DiscordChannel as DiscordChannelSchema,
  DiscordRole as DiscordRoleSchema,
  Giveaway as GiveawaySchema,
  GiveawayBooster as GiveawayBoosterSchema,
  GiveawayEntrant as GiveawayEntrantSchema,
  GiveawayEntriesEndpoint,
  GiveawayMutationResponse as GiveawayMutationResponseSchema,
  GiveawayRerollResponse as GiveawayRerollResponseSchema,
  GiveawaysResponse as GiveawaysResponseSchema,
  GiveawayWinner as GiveawayWinnerSchema,
  GuildsEndpoint,
  LinkParseSettings as LinkParseSettingsSchema,
  PlayerStrikeSummaryEndpoint,
  RemoveServerStrikeEndpoint,
  SearchBannedPlayersEndpoint,
  ServerClansEndpoint,
  ServerGiveawaysEndpoint,
  ServerLinksEndpoint,
  ServerSettingsEndpoint,
  Strike as StrikeSchema,
  StrikeRequest as StrikeRequestSchema,
  UpdateClanSettingsEndpoint,
  UpdateServerSettingsEndpoint,
  type EndpointRequest,
  type EndpointResponse,
} from "@clashking/api-contracts";
import { Schema } from "effect";

export type LinkParseSettings = (typeof LinkParseSettingsSchema)["Type"];
export type ServerSettings = EndpointResponse<typeof ServerSettingsEndpoint>;
export type ServerSettingsUpdate = EndpointRequest<typeof UpdateServerSettingsEndpoint>["body"];
export type ServerSettingsResponse = EndpointResponse<typeof UpdateServerSettingsEndpoint>;
export type DiscordChannel = (typeof DiscordChannelSchema)["Type"];
export type DiscordRole = (typeof DiscordRoleSchema)["Type"];
export type ClanSettings = EndpointResponse<typeof ClanSettingsEndpoint>;
export type ClanSettingsUpdate = EndpointRequest<typeof UpdateClanSettingsEndpoint>["body"];
export type ClanSettingsResponse = EndpointResponse<typeof UpdateClanSettingsEndpoint>;
export type ServerClanListItem = EndpointResponse<typeof ServerClansEndpoint>[number];
export type BanRequest = (typeof BanRequestSchema)["Type"];
export type BannedPlayer = (typeof BannedPlayerSchema)["Type"];
export type BanResponse = EndpointResponse<typeof AddServerBanEndpoint>;
export type SearchBannedPlayersResponse = EndpointResponse<typeof SearchBannedPlayersEndpoint>;
export type StrikeRequest = (typeof StrikeRequestSchema)["Type"];
export type Strike = (typeof StrikeSchema)["Type"];
export type StrikeAddResponse = EndpointResponse<typeof AddServerStrikeEndpoint>;
export type StrikeDeleteResponse = EndpointResponse<typeof RemoveServerStrikeEndpoint>;
export type StrikeSummary = EndpointResponse<typeof PlayerStrikeSummaryEndpoint>;
export type GuildInfo = EndpointResponse<typeof GuildsEndpoint>[number];
export type ServerLinksResponse = EndpointResponse<typeof ServerLinksEndpoint>;
export type GiveawayBooster = (typeof GiveawayBoosterSchema)["Type"];
export type GiveawayWinner = (typeof GiveawayWinnerSchema)["Type"];
export type Giveaway = (typeof GiveawaySchema)["Type"];
export type GiveawaysResponse = EndpointResponse<typeof ServerGiveawaysEndpoint>;
export type GiveawayMutationResponse = (typeof GiveawayMutationResponseSchema)["Type"];
export type GiveawayEntrant = (typeof GiveawayEntrantSchema)["Type"];
export type GiveawayEntriesResponse = EndpointResponse<typeof GiveawayEntriesEndpoint>;
export type GiveawayRerollResponse = (typeof GiveawayRerollResponseSchema)["Type"];

export const isGiveaway = Schema.is(GiveawaySchema);
export const isGiveawaysResponse = Schema.is(GiveawaysResponseSchema);
