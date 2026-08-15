import { ClanSignal } from "@/components/landing/explorations/clan-signal";
import { getPublicMetadata } from "@/lib/public-seo";

export const metadata = getPublicMetadata("en", "home");

export default function HomePage() {
  return <ClanSignal />;
}
