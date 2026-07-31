import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("fr", "privacy");

export default function FrenchPrivacyPage() {
  return <PublicPage locale="fr" page="privacy" />;
}
