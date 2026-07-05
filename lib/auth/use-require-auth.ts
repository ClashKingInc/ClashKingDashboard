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
    const hasCredentials =
      !!localStorage.getItem("access_token") || !!localStorage.getItem("refresh_token");
    if (hasCredentials) return;

    try {
      sessionStorage.setItem("post_login_redirect", pathname);
    } catch {
      // Storage may be unavailable; redirect anyway
    }
    router.push(`/${locale}/login`);
  }, [router, pathname, locale]);
}
