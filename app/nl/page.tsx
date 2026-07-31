import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("nl", "home");

export default function DutchHomePage() {
  return <PublicPage locale="nl" page="home" />;
}
