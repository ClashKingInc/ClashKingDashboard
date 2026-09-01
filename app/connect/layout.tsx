import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Connect an app | ClashKing",
  robots: { index: false, follow: false },
};

export default function ConnectLayout({ children }: { readonly children: React.ReactNode }) {
  return children;
}
