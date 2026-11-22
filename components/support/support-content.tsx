"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, MessageCircle } from "lucide-react";
import { useTranslations } from "use-intl";
import Image from "@/components/app-image";
import { Button } from "@/components/ui/button";
import { PlatformMark } from "@/components/landing/explorations/clan-signal/hero-actions";
import { embeddedServerId } from "@/lib/auth/embedded";
import { KOFI_URL, SUPPORT_DISCORD_URL } from "@/lib/support";

export function SupportContent({ compact = false, showHeader = true }: { compact?: boolean; showHeader?: boolean }) {
  const support = useTranslations("SupportPage");
  const creator = useTranslations("SupportPage.creatorCode");
  const limits = useTranslations("ManualLimits");
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    // Financial support actions stay outside embedded app/setup sessions.
    setStandalone(!embeddedServerId() && window.parent === window && !(window as Window & { ReactNativeWebView?: unknown }).ReactNativeWebView);
  }, []);

  return <div className={compact ? "mx-auto max-w-4xl space-y-6 p-4 md:p-6" : "cs-support-content mx-auto max-w-4xl space-y-6"}>
    {showHeader && <header className="max-w-2xl space-y-2"><h1 className="text-2xl font-semibold md:text-3xl">{limits("supportTitle")}</h1><p className="text-sm leading-relaxed text-muted-foreground">{support("subtitle")}</p></header>}
    {standalone && <div className="grid items-stretch gap-4 md:grid-cols-2">
      <section className="flex flex-col items-start gap-4 rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
        <Image src="/support/kofi.avif" width={44} height={44} alt="" />
        <h2 className="text-lg font-semibold">{limits("kofi")}</h2>
        <p className="text-sm leading-relaxed text-muted-foreground">{support("whySupport.description")}</p>
        <Button asChild className="mt-auto min-h-11 gap-2"><a href={KOFI_URL} target="_blank" rel="noopener noreferrer">{limits("kofi")}<ArrowUpRight className="h-4 w-4" aria-hidden="true" /></a></Button>
      </section>
      <section className="flex flex-col gap-4 rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-semibold">{creator("title")}</h2><Image src="https://assets.clashk.ing/decorations/home-village/creator_fountain.webp" width={80} height={84} alt="" className="h-[84px] w-20 shrink-0 object-contain" /></div>
        <p className="text-sm leading-relaxed text-muted-foreground">{creator("description")} <strong className="font-semibold text-foreground">CLASHKING</strong> {creator("descriptionSuffix")}</p>
        <div className="mt-auto flex flex-col gap-2">
          <Button asChild variant="secondary" className="cs-store-action min-h-11 justify-between gap-2"><a href="https://link.clashofclans.com/en/?action=SupportCreator&id=Clashking" target="_blank" rel="noopener noreferrer">{creator("ctaGame")}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a></Button>
          <Button asChild variant="ghost" className="cs-store-action min-h-11 justify-between gap-2"><a href="https://store.supercell.com/en/clashofclans?boost=clashking" target="_blank" rel="noopener noreferrer">{creator("ctaStore")}<ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden="true" /></a></Button>
        </div>
      </section>
    </div>}
    <section className="flex flex-col items-start gap-4 rounded-2xl bg-muted/55 p-5 sm:flex-row sm:items-center">
      <MessageCircle className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" /><p className="min-w-0 flex-1 text-sm leading-relaxed text-muted-foreground">{limits("raise")}</p>
      <Button asChild variant="secondary" className="cs-store-action min-h-11 shrink-0 gap-2"><a href={SUPPORT_DISCORD_URL} target="_blank" rel="noopener noreferrer"><span className="inline-flex h-5 w-5 shrink-0 [&_svg]:h-full [&_svg]:w-full [&_svg]:fill-current"><PlatformMark platform="discord" /></span>{limits("discord")}</a></Button>
    </section>
  </div>;
}
