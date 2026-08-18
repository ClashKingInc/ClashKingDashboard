import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Shared roster view | ClashKing",
  robots: { index: false, follow: false },
};

export default function SharedRosterViewLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
