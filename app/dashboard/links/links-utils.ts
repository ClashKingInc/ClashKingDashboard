export const SERVER_LINK_MEMBER_LIMIT = 5_000;

export function playerLookupPath(playerTag: string): string {
  return `/proxy/v1/players/${encodeURIComponent(playerTag)}`;
}

export function loadedMembersDetail(loadedMembers: number, serverMembers?: number): string {
  if (serverMembers && serverMembers > loadedMembers) {
    return `${loadedMembers.toLocaleString()} of ${serverMembers.toLocaleString()} server members loaded`;
  }

  if (loadedMembers >= SERVER_LINK_MEMBER_LIMIT) {
    return `Member loading is capped at ${SERVER_LINK_MEMBER_LIMIT.toLocaleString()}`;
  }

  return "Current Discord members";
}
