import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared Roster | ClashKing",
  description: "View a ClashKing roster shared from Discord.",
  robots: { index: false, follow: false },
};

export default function SharedRosterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
