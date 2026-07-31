import { PublicPage } from "@/components/public-page";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("en", "terms");

export default function TermsPage() {
  return <PublicPage locale="en" page="terms" />;
}
