import { SERVER_COUNT } from "@/lib/constants";
import { formatCompactCount } from "@/lib/format-count";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// Refresh the public server count at most every 6 hours
const REVALIDATE_SECONDS = 6 * 60 * 60;

/**
 * Fetch the live bot server count for public pages (server-side only).
 *
 * The upstream endpoint requires authentication; set CLASHKING_API_TOKEN in
 * the deployment environment to enable live counts. Falls back to the static
 * SERVER_COUNT constant whenever the fetch fails or no token is configured.
 */
export async function getServerCountLabel(): Promise<string> {
  const token = process.env.CLASHKING_API_TOKEN;
  if (!token) return SERVER_COUNT;

  try {
    const response = await fetch(`${API_BASE_URL}/v2/internal/bot/info`, {
      headers: { Authorization: `Bearer ${token}` },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return SERVER_COUNT;

    const data = await response.json().catch(() => null);
    const totalServers = data?.bot?.total_servers;
    if (typeof totalServers !== "number" || totalServers <= 0) {
      return SERVER_COUNT;
    }

    return formatCompactCount(totalServers);
  } catch {
    return SERVER_COUNT;
  }
}
