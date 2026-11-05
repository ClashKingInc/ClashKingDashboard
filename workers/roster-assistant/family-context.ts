import { DashboardListRostersEndpoint, DashboardQueryFamilyWarMetricEndpoint, ProxyClanEndpoint, ServerClansBasicEndpoint, type EndpointRequest } from "@clashking/api-contracts";
import { executeAssistantEndpoint } from "./api-client";

export function readFamilyWarMetric(apiOrigin: string, userToken: string, serverId: string,
  input: EndpointRequest<typeof DashboardQueryFamilyWarMetricEndpoint>["body"], signal?: AbortSignal) {
  return executeAssistantEndpoint(apiOrigin, userToken, DashboardQueryFamilyWarMetricEndpoint,
    { path: {}, query: { server_id: serverId }, body: input }, signal);
}

/** Server scope comes from the authorized request context, never model input. */
export async function readFamilyMembers(apiOrigin: string, userToken: string, serverId: string, signal?: AbortSignal) {
  const [clans, rosterList] = await Promise.all([
    executeAssistantEndpoint(apiOrigin, userToken, ServerClansBasicEndpoint, { path: { serverId }, query: {}, body: {} }, signal),
    executeAssistantEndpoint(apiOrigin, userToken, DashboardListRostersEndpoint, { path: { serverId }, query: {}, body: {} }, signal),
  ]);
  const players: Array<{ playerTag: string; name: string; townhall: number; clanTag: string; clanName: string; rosterIds: string[] }> = [];
  // Never return partial discovery: it could misclassify players as unassigned.
  for (let start = 0; start < clans.length; start += 4) {
    const snapshots = await Promise.all(clans.slice(start, start + 4).map(clan => executeAssistantEndpoint(apiOrigin, userToken, ProxyClanEndpoint, { path: { clanTag: clan.tag }, query: {}, body: {} }, signal)));
    for (const clan of snapshots) for (const member of clan.memberList ?? []) {
      players.push({ playerTag: member.tag, name: member.name, townhall: member.townHallLevel ?? 0, clanTag: clan.tag, clanName: clan.name,
        rosterIds: rosterList.rosters.filter(roster => roster.members?.some(assigned => assigned.tag === member.tag)).map(roster => roster.id) });
    }
  }
  return { clans: clans.map(clan => ({ tag: clan.tag, name: clan.name })), players };
}

export function validateNewFamilyRoster(family: Awaited<ReturnType<typeof readFamilyMembers>>, input: { rosterType: "clan" | "family"; clanTag: string | null; memberTags: string[] }) {
  const unassigned = new Set(family.players.filter(player => player.rosterIds.length === 0 && (input.rosterType !== "clan" || player.clanTag === input.clanTag)).map(player => player.playerTag));
  const memberTags = [...new Set(input.memberTags)];
  if (memberTags.some(tag => !unassigned.has(tag))) throw new Error("New-roster members must be currently unassigned players in this server's configured clans.");
  if (input.rosterType === "clan" && !family.clans.some(clan => clan.tag === input.clanTag)) throw new Error("Choose a configured clan for a clan roster.");
  return memberTags;
}
