import { defineEndpoint, ErrorResponse, type ContractSchema } from "@clashking/api-contracts";
import { Schema } from "effect";
import { executeSharedApiResult, type SharedApiResult } from "@/lib/api/shared-client";

export type Permission = "teams" | "tournaments" | "participants" | "matches" | "scores" | "penalties" | "permissions";
export const permissionNames: readonly Permission[] = ["teams", "tournaments", "participants", "matches", "scores", "penalties", "permissions"];
export interface CompetitiveProfile {
  userId: string; displayName: string; avatarUrl: string | null; bannerUrl: string | null;
  private: boolean; hideDiscord: boolean; updatedAt?: string;
  accounts: { tag: string; name?: string }[];
}
export interface Team {
  id: string; clanTag: string; clanName: string; internalName: string; size: number; archived: boolean;
  members: { playerTag: string; name: string; joinedAt?: string; acceptedAt: string | null; profile?: { userId: string; displayName: string; avatarUrl: string | null } | null }[];
}
export interface Tournament {
  id: string; serverId: string; name: string; format: string; teamSize: number; startsAt: string; endsAt: string;
  status: string; rules: Record<string, unknown>;
}
export interface Participant { teamId: string; clanTag?: string; clanName?: string; roster?: { playerTag: string; name?: string; townHallLevel?: number }[]; status?: string; withdrawnAt?: string | null; checkedInAt?: string | null }
export interface Match { id: string; homeTeamId: string; awayTeamId: string; round: number; homeScore: number | null; awayScore: number | null; rawHomeScore?: number | null; rawAwayScore?: number | null; status: string; warId?: string | null; penalty?: { homeDeduction: number; awayDeduction: number; reason: string } | null }
export interface Standing { teamId: string; played: number; wins: number; losses: number; draws: number; points: number; elo: number }
export interface TournamentDetail { tournament: Tournament; participants: Participant[]; matches: Match[]; standings: Standing[] }
export interface Attack {
  warId: string; attackingClanTag: string; attackerTag: string; attackerName: string; attackerTownhall: number;
  defenderTag: string; defenderName: string; defenderTownhall: number; stars: number; destructionPercentage: number; duration: number; attackOrder: number;
}
export interface AuditEntry { id?: string; action: string; actorId?: string; createdAt?: string; before?: unknown; after?: unknown; reason?: string }
export interface MembershipHistory { teamId: string; playerTag: string; joinedAt: string; leftAt: string | null }
export interface Overview { teams: Team[]; tournaments: Tournament[]; verifiedClans: { tag: string; name: string; badgeUrl?: string }[]; permissions: Permission[]; manager: boolean }
export interface Grant { roleId: string; permission: Permission }

const ProfileIdentity = Schema.Struct({ userId: Schema.String, displayName: Schema.String, avatarUrl: Schema.NullOr(Schema.String) });
const TeamSchema = Schema.Struct({ id: Schema.String, clanTag: Schema.String, clanName: Schema.String, internalName: Schema.String, size: Schema.Number, archived: Schema.Boolean, members: Schema.Array(Schema.Struct({ playerTag: Schema.String, name: Schema.NullOr(Schema.String), joinedAt: Schema.String, acceptedAt: Schema.NullOr(Schema.String), profile: Schema.NullOr(ProfileIdentity) })) });
const TournamentSchema = Schema.Struct({ id: Schema.String, serverId: Schema.String, name: Schema.String, format: Schema.String, teamSize: Schema.Number, startsAt: Schema.String, endsAt: Schema.String, status: Schema.String, rules: Schema.Record(Schema.String, Schema.Unknown) });
const OverviewSchema = Schema.Struct({ teams: Schema.Array(TeamSchema), tournaments: Schema.Array(TournamentSchema), verifiedClans: Schema.Array(Schema.Struct({ tag: Schema.String, name: Schema.String })), permissions: Schema.Array(Schema.String), manager: Schema.Boolean });
const ProfileSchema = Schema.Struct({ userId: Schema.String, displayName: Schema.String, avatarUrl: Schema.NullOr(Schema.String), bannerUrl: Schema.NullOr(Schema.String), private: Schema.Boolean, hideDiscord: Schema.Boolean, accounts: Schema.Array(Schema.Struct({ tag: Schema.String, name: Schema.NullOr(Schema.String) })) });

// New server routes use the existing shared transport so cookie refresh, scoped
// bearer tokens, cancellation, and API failures keep the Dashboard's behavior.
// These descriptors can move to api-contracts when that package is released.
const errorResponses = [400, 401, 403, 404, 409, 413, 415, 422, 429, 500, 502, 503, 504].map(status => ({ status, body: ErrorResponse }));
function endpoint(method: "GET" | "POST" | "PUT" | "DELETE", path: `/${string}`) {
  // Declared failures let executeStatus decode the API's message before an
  // Effect failure wrapper can replace the original Error.message with "".
  return defineEndpoint({ method, path, operationId: `competitive.${method}.${path}`, summary: "Competitive administration", auth: "user", bodyMode: method === "GET" || method === "DELETE" ? "none" : "json", responseMode: "json", successStatus: 200, pathParams: Schema.Struct({}), query: Schema.Struct({}), body: Schema.Unknown, response: Schema.Unknown, errors: errorResponses });
}
function responseData<T>(result: SharedApiResult<T>): T {
  if (result.error || result.data === undefined) throw new Error(result.error?.trim() || "Competition request failed. Please try again.");
  return result.data;
}
async function request<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: `/${string}`, body: unknown = {}, signal?: AbortSignal, schema?: ContractSchema): Promise<T> {
  const result = responseData(await executeSharedApiResult(endpoint(method, path), { path: {}, query: {}, body }, { signal }));
  if (schema && !Schema.is(schema)(result)) throw new Error("Competition data could not be validated. Refresh or contact support.");
  return result as T;
}
const serverPath = (serverId: string) => `/v2/competitive/servers/${encodeURIComponent(serverId)}` as const;
const id = encodeURIComponent;
export const competitiveApi = {
  overview: (serverId: string, signal?: AbortSignal) => request<Overview>("GET", `${serverPath(serverId)}/overview`, {}, signal, OverviewSchema),
  teams: (serverId: string, signal?: AbortSignal) => request<{ items: Team[]; history: MembershipHistory[] }>("GET", `${serverPath(serverId)}/teams`, {}, signal),
  createTeam: (serverId: string, body: { clanTag: string; internalName: string; size: number }) => request("POST", `${serverPath(serverId)}/teams`, body),
  updateTeam: (serverId: string, teamId: string, body: { internalName?: string; archived?: boolean }) => request("PUT", `${serverPath(serverId)}/teams/${id(teamId)}`, body),
  addMember: (serverId: string, teamId: string, playerTag: string) => request("POST", `${serverPath(serverId)}/teams/${id(teamId)}/members`, { playerTag }),
  removeMember: (serverId: string, teamId: string, playerTag: string) => request("DELETE", `${serverPath(serverId)}/teams/${id(teamId)}/members/${id(playerTag)}`),
  createTournament: (serverId: string, body: unknown) => request("POST", `${serverPath(serverId)}/tournaments`, body),
  updateTournament: (serverId: string, tournamentId: string, body: unknown) => request("PUT", `${serverPath(serverId)}/tournaments/${id(tournamentId)}`, body),
  tournament: (serverId: string, tournamentId: string, signal?: AbortSignal) => request<TournamentDetail>("GET", `${serverPath(serverId)}/tournaments/${id(tournamentId)}`, {}, signal),
  enter: (serverId: string, tournamentId: string, teamId: string) => request("POST", `${serverPath(serverId)}/tournaments/${id(tournamentId)}/participants`, { teamId }),
  withdraw: (serverId: string, tournamentId: string, teamId: string) => request("DELETE", `${serverPath(serverId)}/tournaments/${id(tournamentId)}/participants/${id(teamId)}`),
  createMatch: (serverId: string, tournamentId: string, body: unknown) => request("POST", `${serverPath(serverId)}/tournaments/${id(tournamentId)}/matches`, body),
  generateMatches: (serverId: string, tournamentId: string) => request<{ round: number; matches: string[]; completed: boolean }>("POST", `${serverPath(serverId)}/tournaments/${id(tournamentId)}/generate`),
  syncWars: (serverId: string, tournamentId: string) => request<{ updated: number }>("POST", `${serverPath(serverId)}/tournaments/${id(tournamentId)}/sync`),
  attacks: (serverId: string, matchId: string, signal?: AbortSignal) => request<{ items: Attack[] }>("GET", `${serverPath(serverId)}/matches/${id(matchId)}/attacks`, {}, signal),
  updateMatch: (serverId: string, matchId: string, body: unknown) => request("PUT", `${serverPath(serverId)}/matches/${id(matchId)}`, body),
  permissions: (serverId: string, signal?: AbortSignal) => request<{ items: Grant[] }>("GET", `${serverPath(serverId)}/permissions`, {}, signal),
  savePermissions: (serverId: string, items: Grant[]) => request("PUT", `${serverPath(serverId)}/permissions`, { items }),
  audit: (serverId: string, signal?: AbortSignal) => request<{ items: AuditEntry[] }>("GET", `${serverPath(serverId)}/audit`, {}, signal),
  profile: (signal?: AbortSignal) => request<CompetitiveProfile>("GET", "/v2/competitive/profile", {}, signal, ProfileSchema),
  saveProfile: (body: unknown) => request("PUT", "/v2/competitive/profile", body),
  uploadProfileImage: async (file: File) => {
    const upload = defineEndpoint({ ...endpoint("POST", "/v2/competitive/profile/image"), bodyMode: "multipart", response: Schema.Struct({ url: Schema.String }) });
    const body = new FormData(); body.append("file", file);
    return responseData(await executeSharedApiResult(upload, { path: {}, query: {}, body }));
  },
};
