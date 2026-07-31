import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("nl", "terms");

export default function DutchTermsPage() {
  return <PublicPage locale="nl" page="terms" />;
}
