"use client";
import Image from "@/components/app-image";
import { useEffect,useState } from "react";
import { useTheme } from "next-themes";
import { useLocale,useTranslations } from "use-intl";
import { Avatar,AvatarImage,AvatarFallback } from "@/components/ui/avatar";
import { Select,SelectContent,SelectItem,SelectTrigger,SelectValue } from "@/components/ui/select";
import { useAuthSession } from "@/components/auth-session-provider";
import { updateDashboardLocale } from "@/components/locale-provider";
import { DASHBOARD_LOCALE_MODE_STORAGE_KEY,LANGUAGE_OPTIONS,getLocaleModeFromStorage,resolveBrowserLocale,type LocaleMode,type SupportedLocale } from "@/lib/locale-preference";
import { useGuildId } from "@/lib/dashboard-route";
import { ResourceLimits } from "@/components/support/resource-limits";
const THEME_OPTIONS=["system","light","dark"] as const;
const FILLED_SELECT_CLASS="border-0 bg-muted/55 shadow-sm shadow-black/5 focus:ring-2 focus:ring-ring/30";
function LanguageOption({ flagCode, locale, name }: { readonly flagCode: string; readonly locale: SupportedLocale; readonly name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="relative h-3.5 w-5 overflow-hidden rounded-sm">
        <Image src={`https://flagcdn.com/w40/${flagCode}.png`} alt="" fill sizes="20px" className="object-cover" />
      </span>
      <span lang={locale}>{name}</span>
    </span>
  );
}

export default function AccountSettingsPage(){
 const t=useTranslations("AccountSettings"),locale=useLocale() as SupportedLocale,{user}=useAuthSession(),serverId=useGuildId(),{theme="system",setTheme}=useTheme();
 const [mounted,setMounted]=useState(false),[localeMode,setLocaleMode]=useState<LocaleMode>("manual");
 useEffect(()=>{setMounted(true);setLocaleMode(getLocaleModeFromStorage(localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY)))},[]);
 const applyLanguage=(value:string)=>{const mode=value==="browser"?"browser":"manual";setLocaleMode(mode);updateDashboardLocale(value==="browser"?resolveBrowserLocale(navigator.languages):value as SupportedLocale,mode)};
 const languageValue=localeMode==="browser"?"browser":locale;
 return <div className="mx-auto max-w-4xl space-y-7 p-4 pb-12 md:p-6"><header><h1 className="text-2xl font-bold">{t("title")}</h1><p className="text-sm text-muted-foreground">{t("description")}</p></header>
      <section className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6" aria-labelledby="profile-settings-title">
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarImage src={user?.avatar_url} alt={user?.username} />
            <AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <h2 id="profile-settings-title" className="truncate font-semibold">{user?.username}</h2>
            <p className="text-sm text-muted-foreground">{t("profile.title")}</p>
          </div>
        </div>

        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          <label className="space-y-2" htmlFor="account-theme">
            <span className="text-sm font-medium">{t("appearance.theme")}</span>
            <Select value={mounted ? theme : "system"} onValueChange={setTheme}>
              <SelectTrigger id="account-theme" className={FILLED_SELECT_CLASS}><SelectValue /></SelectTrigger>
              <SelectContent>{THEME_OPTIONS.map((value) => <SelectItem key={value} value={value}>{t(`appearance.themes.${value}`)}</SelectItem>)}</SelectContent>
            </Select>
          </label>
          <label className="space-y-2" htmlFor="account-language">
            <span className="text-sm font-medium">{t("appearance.language")}</span>
            <Select value={mounted ? languageValue : "browser"} onValueChange={applyLanguage}>
              <SelectTrigger id="account-language" className={FILLED_SELECT_CLASS}><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="browser">{t("appearance.browserLanguage")}</SelectItem>
                {LANGUAGE_OPTIONS.map((language) => <SelectItem key={language.code} value={language.code}><LanguageOption flagCode={language.flagCode} locale={language.code} name={language.name} /></SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        </div>
      </section>

{serverId && <ResourceLimits serverId={serverId}/>}</div>;
}
