import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("fr", "home");

export default function FrenchHomePage() {
  return <PublicPage locale="fr" page="home" />;
}
