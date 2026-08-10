"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Check, ExternalLink } from "lucide-react";
import { useTranslations } from "next-intl";
import { dashboardHref, useGuildId } from "@/lib/dashboard-route";
import {
  AUTOBOARD_FREE_LIMIT,
  AUTOBOARD_SUBSCRIBER_LIMIT,
} from "@/lib/subscription-entitlements";

interface SupportContentProps {
  readonly compact?: boolean;
}

const SUBSCRIPTION_PERKS = [
  "notifications",
  "credit",
  "botProfile",
  "autoBoards",
  "crossPlatform",
] as const;

export function SupportContent({ compact = false }: SupportContentProps) {
  const t = useTranslations("SupportPage");
  const guildId = useGuildId();
  const subscriptionHref = compact && guildId
    ? dashboardHref("settings", guildId)
    : compact
      ? "/dashboard/settings"
      : "/login";

  return (
    <main className={`container mx-auto max-w-5xl px-4 ${compact ? "py-8 md:px-6 md:py-10" : "py-20 md:py-24"}`}>
      <header className="mb-10 max-w-2xl md:mb-12">
        <h1 className="text-3xl font-bold text-foreground md:text-4xl">
          {t("title")}
        </h1>
        <p className="mt-3 text-base leading-7 text-muted-foreground md:text-lg">
          {t("subtitle")}
        </p>
      </header>

      <div className="grid gap-5 min-[900px]:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <section className="flex flex-col rounded-3xl bg-card p-6 shadow-sm shadow-black/5 sm:p-8" aria-labelledby="subscription-title">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 id="subscription-title" className="text-2xl font-bold text-foreground">{t("subscription.title")}</h2>
            </div>
            <p className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-semibold text-primary">
              {t("subscription.price")}
            </p>
          </div>
          <ul className="mt-6 space-y-1">
            {SUBSCRIPTION_PERKS.map((perk) => (
              <li key={perk} className="flex items-center gap-3 py-2.5 text-sm font-medium text-foreground">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                </span>
                <span>{t("subscription.perks." + perk, {
                  freeLimit: AUTOBOARD_FREE_LIMIT,
                  paidLimit: AUTOBOARD_SUBSCRIBER_LIMIT,
                })}</span>
              </li>
            ))}
          </ul>

          <Link
            href={subscriptionHref}
            className="mt-7 inline-flex min-h-11 items-center justify-center gap-2 self-start rounded-xl bg-primary px-5 py-2.5 font-semibold text-primary-foreground outline-none transition-colors hover:bg-primary/90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {compact ? t("subscription.ctaDashboard") : t("subscription.cta")}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </section>

        <section className="flex flex-col rounded-3xl bg-muted/55 p-6 shadow-sm shadow-black/5 sm:p-8" aria-labelledby="creator-code-title">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[15rem]">
              <h2 id="creator-code-title" className="text-2xl font-bold text-foreground">{t("creatorCode.title")}</h2>
            </div>
            <div className="relative h-[126px] w-[120px] shrink-0" aria-hidden="true">
              <Image
                src="https://assets.clashk.ing/decorations/home-village/creator_fountain.webp"
                alt=""
                fill
                sizes="120px"
                className="object-contain drop-shadow-xl"
              />
            </div>
          </div>
          <p className="mt-6 max-w-sm leading-7 text-muted-foreground">
            {t("creatorCode.description")}{" "}
            <span className="font-bold text-primary">CLASHKING</span>{" "}
            {t("creatorCode.descriptionSuffix")}
          </p>
          <div className="mt-auto space-y-2.5 pt-6">
            <Link
              href="https://link.clashofclans.com/en/?action=SupportCreator&id=Clashking"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-5 py-2.5 font-semibold text-background outline-none transition-opacity hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("creatorCode.ctaGame")} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
            <Link
              href="https://store.supercell.com/en/clashofclans?boost=clashking"
              target="_blank"
              rel="noopener noreferrer"
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-background/75 px-5 py-2.5 font-semibold text-foreground shadow-sm shadow-black/5 outline-none transition-colors hover:bg-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {t("creatorCode.ctaStore")} <ExternalLink className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </section>
      </div>

      <section className="mx-auto mt-10 max-w-2xl text-center" aria-labelledby="why-support-title">
        <h2 id="why-support-title" className="text-lg font-semibold text-foreground">{t("whySupport.title")}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {t("whySupport.description")}
        </p>
      </section>
    </main>
  );
}
