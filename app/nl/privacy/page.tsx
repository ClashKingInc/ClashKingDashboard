import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("nl", "privacy");

export default function DutchPrivacyPage() {
  return <PublicPage locale="nl" page="privacy" />;
}
