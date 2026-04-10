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
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";

const languages = [
  { code: "en", name: "English", flagCode: "us" },
  { code: "fr", name: "Français", flagCode: "fr" },
  { code: "nl", name: "Nederlands", flagCode: "nl" },
];

export function LanguageSwitcher() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("LanguageSwitcher");
  const locale = useLocale();
  const [mounted, setMounted] = React.useState(false);

  const currentLocale = locale || "en";

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const switchLocale = (newLocale: string) => {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `NEXT_LOCALE=${newLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
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
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Languages className="h-5 w-5" />
          <span className="sr-only">{t("label")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => switchLocale(lang.code)}
            className={currentLocale === lang.code ? "bg-accent" : ""}
          >
            <div className="mr-2 relative w-5 h-3.5 overflow-hidden rounded-sm border border-border/50">
              <Image
                src={`https://flagcdn.com/w40/${lang.flagCode}.png`}
                alt={lang.name}
                fill
                sizes="20px"
                className="object-cover"
              />
            </div>
            {lang.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
