import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { useRouter } from "@tanstack/react-router";
import { canonicalDashboardHref } from "@/lib/dashboard-origin";

export type AppLinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  readonly href: string;
  readonly replace?: boolean;
  readonly prefetch?: boolean;
};

function shouldUseBrowserNavigation(event: MouseEvent<HTMLAnchorElement>, href: string): boolean {
  return (
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.ctrlKey ||
    event.shiftKey ||
    event.altKey ||
    href.startsWith("mailto:") ||
    href.startsWith("tel:")
  );
}

const AppLink = forwardRef<HTMLAnchorElement, AppLinkProps>(function AppLink(
  { href, onClick, prefetch: _prefetch, replace = false, target, ...props },
  ref,
) {
  const router = useRouter();
  const canonicalHref = canonicalDashboardHref(href, globalThis.location.href);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (shouldUseBrowserNavigation(event, href) || target === "_blank") return;

    const destination = new URL(canonicalHref, globalThis.location.href);
    if (destination.origin !== globalThis.location.origin) return;

    event.preventDefault();
    const route = `${destination.pathname}${destination.search}${destination.hash}`;
    if (replace) router.history.replace(route);
    else router.history.push(route);
  };

  return <a {...props} ref={ref} href={canonicalHref} target={target} onClick={handleClick} />;
});

export default AppLink;
