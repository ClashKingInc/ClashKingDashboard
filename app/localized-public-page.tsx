import { PublicPage } from "@/components/public-page";
import { getPublicRoute } from "@/lib/locale-preference";
import { usePathname } from "@/lib/navigation";

export default function LocalizedPublicPage() {
  const route = getPublicRoute(usePathname());
  if (!route) return null;
  return <PublicPage locale={route.locale} page={route.page === "/" ? "home" : route.page === "/privacy" ? "privacy" : "terms"} />;
}
