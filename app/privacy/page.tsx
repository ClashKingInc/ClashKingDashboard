import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("en", "privacy");

export default function PrivacyPage() {
  return <PublicPage locale="en" page="privacy" />;
}
