"use client";

import Image from "@/components/app-image";
import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "use-intl";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { DashboardTabsList, DashboardTabTrigger } from "@/components/ui/dashboard-tabs";
import { useAuthSession } from "@/components/auth-session-provider";
import { useDashboardAccess } from "@/components/dashboard/dashboard-access-provider";
import { BotProfileCard } from "@/components/dashboard/bot-profile-card";
import { LabSettings } from "@/components/dashboard/lab-settings";
import { updateDashboardLocale } from "@/components/locale-provider";
import { DASHBOARD_LOCALE_MODE_STORAGE_KEY, LANGUAGE_OPTIONS, getLocaleModeFromStorage, resolveBrowserLocale, type LocaleMode, type SupportedLocale } from "@/lib/locale-preference";
import { useGuildId } from "@/lib/dashboard-route";
import { useRouter, useSearchParams } from "@/lib/navigation";
import { ResourceLimits } from "@/components/support/resource-limits";
import { Switch } from "@/components/ui/switch";
import { SUPPORT_HIDDEN_KEY, SUPPORT_PREFERENCE_EVENT } from "@/lib/support";

const THEME_OPTIONS = ["system", "light", "dark"] as const;
const FILLED_SELECT_CLASS = "border-0 bg-muted/55 shadow-sm shadow-black/5 focus:ring-2 focus:ring-ring/30";

function LanguageOption({ flagCode, locale, name }: { readonly flagCode: string; readonly locale: SupportedLocale; readonly name: string }) {
  return <span className="flex items-center gap-2"><span className="relative h-3.5 w-5 overflow-hidden rounded-sm"><Image src={`https://flagcdn.com/w40/${flagCode}.png`} alt="" fill sizes="20px" className="object-cover" /></span><span lang={locale}>{name}</span></span>;
}

export default function AccountSettingsPage() {
  const t = useTranslations("AccountSettings");
  const servers = useTranslations("ServersPage");
  const locale = useLocale() as SupportedLocale;
  const { user } = useAuthSession();
  const serverId = useGuildId();
  const { canView, canManage } = useDashboardAccess();
  const router = useRouter();
  const params = useSearchParams();
  const { theme = "system", setTheme } = useTheme();
  const [hideSupport, setHideSupport] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [localeMode, setLocaleMode] = useState<LocaleMode>("manual");
  useEffect(() => { setMounted(true); setHideSupport(localStorage.getItem(SUPPORT_HIDDEN_KEY) === "1"); setLocaleMode(getLocaleModeFromStorage(localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY))); }, []);
  const applyLanguage = (value: string) => { const mode = value === "browser" ? "browser" : "manual"; setLocaleMode(mode); updateDashboardLocale(value === "browser" ? resolveBrowserLocale(navigator.languages) : value as SupportedLocale, mode); };
  const languageValue = localeMode === "browser" ? "browser" : locale;
  const requestedTab = params.get("tab");
  const tab = requestedTab === "server" && serverId ? "server" : requestedTab === "lab" && serverId && canView("settings") ? "lab" : "profile";
  const selectTab = (value: string) => { const next = new URLSearchParams(params); next.set("tab", value); router.replace(`/dashboard/settings?${next.toString()}`); };

  return <div className="mx-auto w-full min-w-0 max-w-5xl space-y-6 p-4 pb-12 md:p-6">
    <header><h1 className="text-2xl font-bold">{t("title")}</h1></header>
    <Tabs value={tab} onValueChange={selectTab} className="min-w-0 space-y-5">
      <DashboardTabsList aria-label={t("title")}>
        <DashboardTabTrigger value="profile" className="flex-1">{t("profile.title")}</DashboardTabTrigger>
        {serverId && <DashboardTabTrigger value="server" className="flex-1">{servers("server")}</DashboardTabTrigger>}
        {serverId && canView("settings") && <DashboardTabTrigger value="lab" className="flex-1">{t("lab.title")}</DashboardTabTrigger>}
      </DashboardTabsList>
      <TabsContent value="profile" className="space-y-5">
        <section className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6" aria-labelledby="profile-settings-title">
          <div className="flex items-center gap-3"><Avatar className="h-12 w-12"><AvatarImage src={user?.avatar_url} alt={user?.username} /><AvatarFallback>{user?.username?.slice(0, 2).toUpperCase()}</AvatarFallback></Avatar><div className="min-w-0"><h2 id="profile-settings-title" className="truncate font-semibold">{user?.username}</h2><p className="text-sm text-muted-foreground">{t("profile.title")}</p></div></div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2">
            <label className="space-y-2" htmlFor="account-theme"><span className="text-sm font-medium">{t("appearance.theme")}</span><Select value={mounted ? theme : "system"} onValueChange={setTheme}><SelectTrigger id="account-theme" className={FILLED_SELECT_CLASS}><SelectValue /></SelectTrigger><SelectContent>{THEME_OPTIONS.map((value) => <SelectItem key={value} value={value}>{t(`appearance.themes.${value}`)}</SelectItem>)}</SelectContent></Select></label>
            <label className="space-y-2" htmlFor="account-language"><span className="text-sm font-medium">{t("appearance.language")}</span><Select value={mounted ? languageValue : "browser"} onValueChange={applyLanguage}><SelectTrigger id="account-language" className={FILLED_SELECT_CLASS}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="browser">{t("appearance.browserLanguage")}</SelectItem>{LANGUAGE_OPTIONS.map((language) => <SelectItem key={language.code} value={language.code}><LanguageOption flagCode={language.flagCode} locale={language.code} name={language.name} /></SelectItem>)}</SelectContent></Select></label>
          </div>
        </section>
        <section className="flex items-center justify-between gap-4 rounded-3xl bg-card p-5"><label htmlFor="hide-support" className="text-sm font-medium">{t("hideSupport")}</label><Switch id="hide-support" checked={hideSupport} onCheckedChange={value => { setHideSupport(value); localStorage.setItem(SUPPORT_HIDDEN_KEY, value ? "1" : "0"); window.dispatchEvent(new Event(SUPPORT_PREFERENCE_EVENT)); }} /></section>
      </TabsContent>
      {serverId && <TabsContent value="server" className="space-y-8"><ResourceLimits serverId={serverId} />{canView("settings") && <BotProfileCard guildId={serverId} />}</TabsContent>}
      {serverId && canView("settings") && <TabsContent value="lab"><LabSettings key={serverId} serverId={serverId} canManage={canManage("settings")} /></TabsContent>}
    </Tabs>
  </div>;
}
