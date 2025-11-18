"use client";

import * as React from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTranslations } from "next-intl";

export function LanguageSwitcher() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LanguageSwitcher");
  const [mounted, setMounted] = React.useState(false);

  const currentLocale = params.locale as string || "en";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const switchLocale = (newLocale: string) => {
    if (!pathname) return;

    // Replace the locale in the current pathname
    const segments = pathname.split('/');
    segments[1] = newLocale; // Replace locale segment
    const newPath = segments.join('/');

    router.push(newPath);
  };

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" disabled>
        <Languages className="h-5 w-5" />
        <span className="sr-only">{t("label")}</span>
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t("label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onClick={() => switchLocale("en")}
          className={currentLocale === "en" ? "bg-accent" : ""}
        >
          {t("english")}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => switchLocale("fr")}
          className={currentLocale === "fr" ? "bg-accent" : ""}
        >
          {t("french")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
