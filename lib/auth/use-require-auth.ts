"use client";

import { useEffect } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";

/**
 * Client-side auth guard shared by protected pages/layouts.
 *
 * Redirects to the login page when no credentials exist in this browser,
 * remembering the current location so the login flow can return to it.
 * This complements (does not replace) the API-level 401/refresh handling —
 * real authorization is always enforced by the backend.
 */
export function useRequireAuth(): void {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as string) || "en";

  useEffect(() => {
    // Require an access token: several pages still call fetch() with the raw
    // localStorage token and cannot recover from a refresh-token-only state,
    // so send those users through login (which returns them here afterwards).
    // Expired-but-present access tokens are refreshed by the SDK on 401.
    if (localStorage.getItem("access_token")) return;

    try {
      sessionStorage.setItem("post_login_redirect", pathname);
    } catch {
      // Storage may be unavailable; redirect anyway
    }
    router.push(`/${locale}/login`);
  }, [router, pathname, locale]);
}
