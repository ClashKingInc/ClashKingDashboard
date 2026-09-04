import type {
  BotCwlGroupEndpoint,
  ClanCwlSeasonsEndpoint,
  DashboardCwlBonusRecipientsEndpoint,
  EndpointRequest,
  EndpointResponse,
  PlayerWarStatsExportEndpoint,
} from "@clashking/api-contracts";
import { Schema } from "effect";

/** Compile-time tombstones for deliberately removed aggregate-war routes. */
export type PreviousWarsOptions = never;
export type ClanWarStatsOptions = never;

export type PlayerWarhitsFilter = EndpointRequest<typeof PlayerWarStatsExportEndpoint>["body"];
export type CwlSeasonItem = EndpointResponse<typeof ClanCwlSeasonsEndpoint>["items"][number];
export type LeagueReference = NonNullable<CwlSeasonItem["warLeague"]>;
export type CwlBonusRecipient = EndpointResponse<typeof DashboardCwlBonusRecipientsEndpoint>["items"][number];

type ContractCwlGroup = EndpointResponse<typeof BotCwlGroupEndpoint>;
export type CwlGroupMember = ContractCwlGroup["clans"][number]["members"][number];
export type CwlGroupClan = ContractCwlGroup["clans"][number];
type CwlRoundWar = ContractCwlGroup["rounds"][number]["warTags"][number];
export type CwlStoredWar = Extract<CwlRoundWar, { readonly clan: unknown }>;
export type CwlWarPlaceholder = Exclude<CwlRoundWar, CwlStoredWar>;
export type CwlStoredWarClan = CwlStoredWar["clan"];
export type CwlStoredWarMember = NonNullable<CwlStoredWarClan["members"]>[number];
export type CwlStoredWarAttack = NonNullable<CwlStoredWarMember["attacks"]>[number];
export type CwlGroupResponse = ContractCwlGroup;

/** Static CDN data consumed by the CWL bonus calculator, not an API request body. */
export const CwlWarLeagueStaticItemSchema = Schema.Struct({
  _id: Schema.Number,
  name: Schema.String,
  cwl_medals: Schema.Struct({
    first_place: Schema.Number,
    position_medal_diff: Schema.Number,
    bonus_reward: Schema.Number,
    minimum_bonus_amount: Schema.Number,
  }),
  promotions: Schema.optionalKey(Schema.Number),
  demotions: Schema.optionalKey(Schema.Number),
  "15v15_only": Schema.Boolean,
});
export type CwlWarLeagueStaticItem = typeof CwlWarLeagueStaticItemSchema.Type;
export const CwlWarLeaguesStaticResponse = Schema.Struct({ items: Schema.Array(CwlWarLeagueStaticItemSchema) });
