import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("en", "home");

export default function HomePage() {
  return <PublicPage locale="en" page="home" />;
}
