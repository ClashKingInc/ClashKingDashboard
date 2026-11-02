"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { embeddedServerId } from "@/lib/auth/embedded";
import { KOFI_URL } from "@/lib/support";
export function SupportBanner(){
 const t=useTranslations("ManualLimits"),[visible,setVisible]=useState(false);
 useEffect(()=>{setVisible(!embeddedServerId() && window.parent===window && !(window as Window & {ReactNativeWebView?:unknown}).ReactNativeWebView && sessionStorage.getItem("ck_support_dismissed")!=="1")},[]);
 if(!visible)return null;
 return <aside className="flex shrink-0 flex-wrap items-center justify-center gap-3 bg-muted/60 px-4 py-3 text-sm" aria-label={t("supportTitle")}>
 <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 font-medium"><img src="/support/kofi.avif" width="26" height="26" alt=""/>{t("supportText")}</a>
 <Button size="icon" variant="ghost" aria-label={t("dismiss")} onClick={()=>{sessionStorage.setItem("ck_support_dismissed","1");setVisible(false)}}><X className="h-4 w-4"/></Button>
 </aside>
}
