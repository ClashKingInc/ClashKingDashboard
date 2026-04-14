import { redirect } from "next/navigation";

interface SupportRedirectPageProps {
  readonly params: Promise<{ locale: string }>;
}

export default async function SupportRedirectPage({ params }: SupportRedirectPageProps) {
  const { locale } = await params;
  redirect(`/${locale}/support-us`);
}
