/** The desktop client routes through the `-` host, preserving the message destination. */
export function discordMessageAppUrl(guildId: string, channelId: string, messageId: string): string {
  return `discord://-/channels/${[guildId, channelId, messageId].map(encodeURIComponent).join("/")}`;
}
