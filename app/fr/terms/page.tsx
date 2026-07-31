import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("fr", "terms");

export default function FrenchTermsPage() {
  return <PublicPage locale="fr" page="terms" />;
}
