import { useMemo } from "react";
import { useLocation, useRouter as useTanStackRouter } from "@tanstack/react-router";

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
      push: (href: string) => router.history.push(href),
      replace: (href: string) => router.history.replace(href),
      refresh: () => router.invalidate(),
      prefetch: (href: string) => router.preloadRoute({ to: href }),
    }),
    [router],
  );
}
