export function transcriptTabUrl(path: string): string | null {
  const match = /^\/v2\/ticket-transcripts\/([0-9a-f-]{36})$/u.exec(path);
  // Keep the bearer capability out of web-server paths, query logs and referrers.
  return match ? `/transcript#${match[1]}` : null;
}
