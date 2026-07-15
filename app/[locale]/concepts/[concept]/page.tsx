import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ClanSignal } from "@/components/landing/explorations/clan-signal";

const conceptId = "clan-signal";

export const metadata: Metadata = {
  title: "ClashKing landing page concepts",
  description: "Focused visual directions for the ClashKing landing page.",
  robots: { index: false, follow: false },
};

export function generateStaticParams() {
  return [{ concept: conceptId }];
}

export default async function ConceptPage({
  params,
}: {
  params: Promise<{ locale: string; concept: string }>;
}) {
  const { concept } = await params;

  if (concept !== conceptId) {
    notFound();
  }

  return <ClanSignal />;
}
