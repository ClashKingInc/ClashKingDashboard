import type {
  BotClanRankingsEndpoint,
  DashboardClanSearchEndpoint,
  EndpointResponse,
} from "@clashking/api-contracts";

/** Canonical `/v2/clan/:tag/rankings` response. */
export type ClanRanking = EndpointResponse<typeof BotClanRankingsEndpoint>;
export type ClanSearchResult = EndpointResponse<typeof DashboardClanSearchEndpoint>["items"][number];
