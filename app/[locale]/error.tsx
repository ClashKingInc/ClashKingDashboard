"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LocaleError({
  error,
  reset,
}: {
  readonly error: Error & { digest?: string };
  readonly reset: () => void;
}) {
  const t = useTranslations("ErrorBoundary");
  const params = useParams();
  const locale = (params.locale as string) || "en";

  useEffect(() => {
    console.error("Error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center space-y-6 max-w-md">
        <AlertTriangle className="h-12 w-12 mx-auto text-destructive" aria-hidden="true" />
        <h1 className="text-2xl font-semibold">{t("title")}</h1>
        <p className="text-muted-foreground">{t("description")}</p>
        <div className="flex items-center justify-center gap-3">
          <Button onClick={reset}>{t("tryAgain")}</Button>
          <Button variant="outline" asChild>
            <Link href={`/${locale}`}>{t("goHome")}</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
