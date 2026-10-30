const IMAGE_FILE_PATTERN = /\.(?:apng|avif|gif|jpe?g|png|webp)$/i;
const IMAGE_FORMAT_PATTERN = /^(?:apng|avif|gif|jpe?g|png|webp)$/i;

export function getStandaloneImageUrl(message: string | undefined): string | null {
  const candidate = message?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;

    const format = url.searchParams.get("format");
    if (IMAGE_FILE_PATTERN.test(url.pathname) || (format && IMAGE_FORMAT_PATTERN.test(format))) {
      return candidate;
    }
  } catch {
    return null;
  }

  return null;
}

export function getStandaloneTenorUrl(message: string | undefined): string | null {
  const candidate = message?.trim();
  if (!candidate) return null;

  try {
    const url = new URL(candidate);
    const hostname = url.hostname.toLowerCase();
    if (url.protocol !== "https:" || (hostname !== "tenor.com" && hostname !== "www.tenor.com")) return null;

    const match = /^\/view\/.+-(\d+)\/?$/.exec(url.pathname);
    return match ? candidate : null;
  } catch {
    return null;
  }
}

/** Match the API's duration normalization, including legacy minute values. */
export function reminderTimeMinutes(value: string): number {
  const match = /^\s*([+-]?(?:\d+(?:\.\d*)?|\.\d+))\s*(hr|h|min|m)?\s*$/iu.exec(value);
  if (!match) return 0;
  const minutes = Number(match[1]) * (match[2]?.toLowerCase().startsWith("h") ? 60 : 1);
  return Number.isFinite(minutes) ? Math.trunc(minutes) : 0;
}
