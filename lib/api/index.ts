/**
 * ClashKing API Client - Main Export
 *
 * Modular TypeScript client for ClashKing Dashboard API
 * API Base: https://api.clashk.ing
 */

// Main client
export { ClashKingApiClient, createApiClient, apiClient } from './client';

// Specialized clients (for advanced usage)
export { AuthClient } from './clients/auth-client';
export { PlayerClient } from './clients/player-client';
export { ClanClient } from './clients/clan-client';
export { RosterClient } from './clients/roster-client';
export { WarClient } from './clients/war-client';
export { ServerClient } from './clients/server-client';
export { LinkClient } from './clients/link-client';
export { ConnectedAppsClient } from './clients/connected-apps-client';
export { UtilityClient } from './clients/utility-client';
export { LeaderboardClient } from './clients/leaderboard-client';
export { BasesClient } from './clients/bases-client';
export { ClanCategoriesClient } from './clients/clan-categories-client';

// Base client (for extending)
export { BaseApiClient } from './core/base-client';

// Common types
export type { ApiConfig, ApiResponse, PaginatedResponse } from './types/common';

// Auth types
export type {
  UserInfo,
  AuthResponse,
  EmailRegisterRequest,
  EmailAuthRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  DiscordAuthRequest,
  LinkDiscordRequest,
} from './types/auth';

// Player types
export type {
  PlayerTagsRequest,
  PlayerLocation,
  PlayerSorted,
  PlayerSummaryTop,
  PlayerList,
} from './types/player';

// Clan types
export type {
  ClanRanking,
  ClanBoardTotals,
  ClanDonation,
  ClanComposition,
  ClanSearchResult,
} from './types/clan';

// Roster types
export type {
  CreateRosterModel,
  RosterUpdateModel,
  RosterMemberBulkOperationModel,
  UpdateMemberModel,
  CreateRosterGroupModel,
  UpdateRosterGroupModel,
  CreateRosterAutomationModel,
  RosterCloneModel,
  RosterQuestionType,
  RosterSignupQuestion,
  RosterViewColumn,
  RosterViewSpec,
  RosterView,
  RosterViewResult,
  RosterMetricQuery,
  RosterMetricQueryResult,
  CreateRosterViewModel,
  UpdateRosterViewModel,
} from './types/roster';

// War types
export type {
  PreviousWarsOptions,
  ClanWarStatsOptions,
  PlayerWarhitsFilter,
  LeagueReference,
  CwlSeasonItem,
  CwlGroupMember,
  CwlGroupClan,
  CwlStoredWar,
  CwlGroupResponse,
  CwlBonusRecipient,
  CwlWarLeagueStaticItem,
} from './types/war';

// Server types
export type {
  ServerSettings,
  ClanSettings,
  ClanSettingsUpdate,
  ClanSettingsResponse,
  Giveaway,
  GiveawayWinner,
  GiveawayBooster,
  GiveawaysResponse,
  GiveawayMutationResponse,
  GiveawayEntrant,
  GiveawayEntriesResponse,
  GiveawayRerollResponse,
  BanRequest,
} from './types/server';

export type {
  Base,
  BasesResponse,
  CreateBaseRequest,
  BaseImageUploadResponse,
  BaseCreateFailure,
  BaseDownloader,
  BaseDeleteResponse,
  BaseDeleteFailure,
  DiscordMessageCreateCleanup,
  DiscordMessageCleanup,
} from './types/bases';

export type {
  ClanCategory,
  ClanCategoriesResponse,
  ClanCategoryMutationResponse,
  ClanCategoryDeletePreview,
  ClanCategoryDeleteResponse,
} from './types/clan-categories';

// Link types
export type { CocAccountRequest } from './types/link';
export type {
  ConnectedApplication,
  ConnectedApplicationMetadata,
  ShareableAccount,
  ConnectedAppAccessMode,
  ConnectedAppGrant,
  ConnectedAppGrantDetails,
  ConnectedAppGrantListItem,
  ConnectedAppGrantList,
  UpdateConnectedAppGrant,
} from './types/connected-apps';

// Leaderboard types
export type {
  LeaderboardEntry,
  LeaderboardResponse,
  LeaderboardQueryParams,
  LeaderboardCategory,
  LeaderboardEntityType,
  PlayerCapitalMetric,
  ClanCapitalMetric,
  LeaderboardMetric,
} from './types/leaderboard';

// Default export
export { createApiClient as default } from './client';
