import type { Metadata } from "next";
import { ClanSignal } from "@/components/landing/explorations/clan-signal";
import { PublicLocaleProvider } from "@/components/public-locale-provider";

export const metadata: Metadata = {
  title: "ClashKing landing page concepts",
  description: "Focused visual directions for the ClashKing landing page.",
  robots: { index: false, follow: false },
};

export default function ConceptPage() {
  return (
    <PublicLocaleProvider locale="en">
      <ClanSignal />
    </PublicLocaleProvider>
  );
}
