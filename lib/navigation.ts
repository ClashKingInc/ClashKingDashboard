import { useMemo } from "react";
import { useLocation, useRouter as useTanStackRouter } from "@tanstack/react-router";
import { canonicalDashboardHref } from "@/lib/dashboard-origin";

export function usePathname(): string {
  return useLocation({ select: (location) => location.pathname });
}

export function useSearchParams(): URLSearchParams {
  const search = useLocation({ select: (location) => location.searchStr });
  return useMemo(() => new URLSearchParams(search), [search]);
}

export function useRouter() {
  const router = useTanStackRouter();

  return useMemo(
    () => ({
      back: () => router.history.back(),
      push: (href: string) => {
        const target = canonicalDashboardHref(href, globalThis.location.href);
        if (target !== href) globalThis.location.assign(target);
        else router.history.push(href);
      },
      replace: (href: string) => {
        const target = canonicalDashboardHref(href, globalThis.location.href);
        if (target !== href) globalThis.location.replace(target);
        else router.history.replace(href);
      },
      refresh: () => router.invalidate(),
      prefetch: (href: string) => router.preloadRoute({ to: href }),
    }),
    [router],
  );
}
