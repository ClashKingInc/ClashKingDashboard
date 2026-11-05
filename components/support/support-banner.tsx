"use client";
import { useEffect, useState } from "react";
import { useTranslations } from "use-intl";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { embeddedServerId } from "@/lib/auth/embedded";
import { SUPPORT_HIDDEN_KEY, SUPPORT_DISMISSED_UNTIL_KEY, SUPPORT_PREFERENCE_EVENT, KOFI_URL } from "@/lib/support";
export function SupportBanner(){
 const t=useTranslations("ManualLimits"),[visible,setVisible]=useState(false);
 useEffect(()=>{
   const refresh=()=>{try {setVisible(!embeddedServerId() && window.parent===window && !(window as Window & {ReactNativeWebView?:unknown}).ReactNativeWebView && localStorage.getItem(SUPPORT_HIDDEN_KEY)!=="1" && Number(localStorage.getItem(SUPPORT_DISMISSED_UNTIL_KEY)??0)<=Date.now())}catch{setVisible(false)}};
   refresh();window.addEventListener(SUPPORT_PREFERENCE_EVENT,refresh);window.addEventListener("storage",refresh);
   return ()=>{window.removeEventListener(SUPPORT_PREFERENCE_EVENT,refresh);window.removeEventListener("storage",refresh)};
 },[]);
 if(!visible)return null;
 return (
   <aside className="shrink-0 bg-primary/10" aria-label={t("supportTitle")}>
     <div className="mx-auto grid w-full max-w-6xl grid-cols-[minmax(0,1fr)_2.75rem] items-center gap-3 px-4 py-3 sm:px-6">
       <a href={KOFI_URL} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-3 rounded-lg font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
         <img src="/support/kofi.avif" width="26" height="26" className="shrink-0" alt="" />
         <span className="min-w-0 text-sm leading-snug sm:text-base">{t("supportText")}</span>
       </a>
       <Button size="touch-icon" variant="ghost" aria-label={t("dismiss")} onClick={()=>{localStorage.setItem(SUPPORT_DISMISSED_UNTIL_KEY,String(Date.now()+3*24*60*60*1000));setVisible(false)}}><X className="h-4 w-4"/></Button>
     </div>
   </aside>
 );
}
