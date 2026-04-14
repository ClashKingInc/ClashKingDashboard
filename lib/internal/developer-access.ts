export const DEVELOPER_DISCORD_IDS = [
  "506210109790093342",
  "706149153431879760",
  "197469030154633216",
] as const;

const DEVELOPER_DISCORD_ID_SET = new Set<string>(DEVELOPER_DISCORD_IDS);

export function isDeveloperUserId(userId: string | null | undefined): boolean {
  return typeof userId === "string" && DEVELOPER_DISCORD_ID_SET.has(userId);
}
