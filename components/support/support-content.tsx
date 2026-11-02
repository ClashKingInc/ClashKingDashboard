"use client";
import { useEffect,useState } from "react";
import { useTranslations } from "use-intl";
import { embeddedServerId } from "@/lib/auth/embedded";
import { KOFI_URL,SUPPORT_DISCORD_URL } from "@/lib/support";
export function SupportContent({compact=false,showHeader=true}:{compact?:boolean;showHeader?:boolean}){
 const creator=useTranslations("SupportPage.creatorCode");
 const t=useTranslations("ManualLimits"),[standalone,setStandalone]=useState(false);
 useEffect(()=>{setStandalone(!embeddedServerId() && window.parent===window && !(window as Window & {ReactNativeWebView?:unknown}).ReactNativeWebView)},[]);
 return <div className={compact?"mx-auto max-w-3xl space-y-6 p-6":"cs-support-content space-y-6"}>
 {showHeader&&<h1 className="text-3xl font-semibold">{t("supportTitle")}</h1>}
 {standalone&&<section className="space-y-4"><p>{t("supportText")}</p><a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 rounded-xl bg-muted px-5 py-3 font-medium"><img src="/support/kofi.avif" width="32" height="32" alt=""/>{t("kofi")}</a><p className="text-sm text-muted-foreground">{creator("description")} <strong>CLASHKING</strong> {creator("descriptionSuffix")}</p><div className="flex flex-wrap gap-4 text-sm"><a href="https://link.clashofclans.com/en/?action=SupportCreator&id=Clashking" target="_blank" rel="noopener noreferrer" className="text-primary underline">{creator("ctaGame")}</a><a href="https://store.supercell.com/en/clashofclans?boost=clashking" target="_blank" rel="noopener noreferrer" className="text-primary underline">{creator("ctaStore")}</a></div></section>}
 <p>{t("raise")} <a href={SUPPORT_DISCORD_URL} target="_blank" rel="noopener noreferrer" className="text-primary underline">{t("discord")}</a></p></div>
}
