"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ExternalLink, Loader2, LockKeyhole } from "lucide-react";
import { useTheme } from "next-themes";
import { useLocale, useTranslations } from "next-intl";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { InfoPopover } from "@/components/ui/info-popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthSession } from "@/components/auth-session-provider";
import { updateDashboardLocale } from "@/components/locale-provider";
import { apiClient } from "@/lib/api/client";
import type { BillingSubscription, BillingUsage } from "@/lib/api/types/billing";
import type { GuildInfo } from "@/lib/api/types/server";
import {
  DASHBOARD_LOCALE_MODE_STORAGE_KEY,
  LANGUAGE_OPTIONS,
  getLocaleModeFromStorage,
  resolveBrowserLocale,
  type LocaleMode,
  type SupportedLocale,
} from "@/lib/locale-preference";
import { dashboardHref, useGuildId } from "@/lib/dashboard-route";

const THEME_OPTIONS = ["system", "light", "dark"] as const;
const FILLED_SELECT_CLASS = "border-0 bg-muted/55 shadow-sm shadow-black/5 focus:ring-2 focus:ring-ring/30";

export function formatUsd(value: number, fractionDigits = 2): string {
  const smallestDisplayedAmount = 10 ** -fractionDigits;
  if (value > 0 && value < smallestDisplayedAmount) {
    return `<$${smallestDisplayedAmount.toFixed(fractionDigits)}`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

function LanguageOption({ flagCode, name }: { readonly flagCode: string; readonly name: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="relative h-3.5 w-5 overflow-hidden rounded-sm">
        <Image src={`https://flagcdn.com/w40/${flagCode}.png`} alt="" fill sizes="20px" className="object-cover" />
      </span>
      <span>{name}</span>
    </span>
  );
}

function ServerOption({ guild }: { readonly guild: GuildInfo }) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      <Avatar className="h-6 w-6 shrink-0 rounded-lg">
        <AvatarImage src={guild.icon?.startsWith("https") ? guild.icon : undefined} className="rounded-lg" />
        <AvatarFallback className="rounded-lg text-[9px]">{guild.name.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="truncate">{guild.name}</span>
    </span>
  );
}

export default function AccountSettingsPage() {
  const t = useTranslations("AccountSettings");
  const intlLocale = useLocale();
  const locale = intlLocale as SupportedLocale;
  const { user } = useAuthSession();
  const routeGuildId = useGuildId();
  const { theme = "system", setTheme } = useTheme();
  const [localeMode, setLocaleMode] = useState<LocaleMode>("manual");
  const [mounted, setMounted] = useState(false);
  const [subscription, setSubscription] = useState<BillingSubscription | null>(null);
  const [usage, setUsage] = useState<BillingUsage | null>(null);
  const [guilds, setGuilds] = useState<GuildInfo[]>([]);
  const [selectedServerId, setSelectedServerId] = useState(routeGuildId);
  const [loading, setLoading] = useState(true);
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [redirecting, setRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkoutResult, setCheckoutResult] = useState<"success" | "cancelled" | null>(null);

  const load = useCallback(async () => {
    if (!routeGuildId) return;
    setLoading(true);
    setError(null);
    const [subscriptionResponse, guildsResponse] = await Promise.all([
      apiClient.billing.getSubscription(),
      apiClient.servers.getGuilds(),
    ]);
    const nextSubscription = subscriptionResponse.data ?? null;
    const nextServerId = nextSubscription?.assignedServerId || routeGuildId;
    const usageResponse = await apiClient.billing.getUsage(nextServerId);
    setSubscription(nextSubscription);
    setGuilds((guildsResponse.data ?? []).filter((guild) => guild.has_bot));
    setSelectedServerId(nextServerId);
    if (usageResponse.data) setUsage(usageResponse.data);
    setError(subscriptionResponse.error ?? guildsResponse.error ?? usageResponse.error ?? null);
    setLoading(false);
  }, [routeGuildId]);

  useEffect(() => {
    setMounted(true);
    setLocaleMode(getLocaleModeFromStorage(localStorage.getItem(DASHBOARD_LOCALE_MODE_STORAGE_KEY)));
    const checkout = new URLSearchParams(globalThis.location.search).get("checkout");
    if (checkout === "success" || checkout === "cancelled") setCheckoutResult(checkout);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const applyLanguage = (value: string) => {
    const nextMode: LocaleMode = value === "browser" ? "browser" : "manual";
    const nextLocale: SupportedLocale = value === "browser" ? resolveBrowserLocale(navigator.languages) : value as SupportedLocale;
    setLocaleMode(nextMode);
    updateDashboardLocale(nextLocale, nextMode);
  };

  const changeServer = async (serverId: string) => {
    if (!subscription?.active) return;

    const previousServerId = selectedServerId;
    setSelectedServerId(serverId);
    setSavingAssignment(true);
    setError(null);
    try {
      const response = await apiClient.billing.updateAssignment(serverId);
      if (response.error) {
        setSelectedServerId(previousServerId);
        setError(response.error);
        return;
      }
      const [subscriptionResponse, usageResponse] = await Promise.all([
        apiClient.billing.getSubscription(),
        apiClient.billing.getUsage(serverId),
      ]);
      if (subscriptionResponse.data) {
        setSubscription(subscriptionResponse.data);
      } else {
        setSubscription((current) => current ? { ...current, assignedServerId: serverId } : current);
      }
      if (usageResponse.data) setUsage(usageResponse.data);
      setError(subscriptionResponse.error ?? usageResponse.error ?? null);
    } catch (assignmentError) {
      setSelectedServerId(previousServerId);
      setError(assignmentError instanceof Error ? assignmentError.message : String(assignmentError));
    } finally {
      setSavingAssignment(false);
    }
  };

  const openStripe = async () => {
    if (!subscription?.active && !subscription?.checkoutEnabled) return;
    if (!subscription?.active && !selectedServerId) {
      setError(t("billing.selectServerFirst"));
      return;
    }
    setRedirecting(true);
    setError(null);
    const response = subscription?.active
      ? await apiClient.billing.createPortal()
      : await apiClient.billing.createCheckout(selectedServerId);
    if (response.error || !response.data?.url) {
      setError(response.error ?? t("billing.stripeUnavailable"));
      setRedirecting(false);
      return;
    }
    globalThis.location.assign(response.data.url);
  };

  const languageValue = localeMode === "browser" ? "browser" : locale;
  const paidPool = (usage?.assignedSubscriberCount ?? 0) > 0;
  const spent = paidPool ? usage?.paidSpentUsd : usage?.serverSpentUsd;
  const limit = paidPool ? usage?.paidLimitUsd : usage?.serverLimitUsd;
  const usagePercent = useMemo(() => limit ? Math.min(100, ((spent ?? 0) / limit) * 100) : 0, [limit, spent]);
  const assignableGuilds = guilds.filter((guild) => !guild.inactive);
  const selectedGuild = guilds.find((guild) => guild.id === selectedServerId);
  const supportHref = dashboardHref("support-us", routeGuildId);
  const checkoutUnavailable = !loading && subscription?.active !== true && subscription?.checkoutEnabled !== true;

  return (
    <div className="mx-auto max-w-4xl space-y-7 p-4 pb-12 md:p-6 lg:p-8">
      <header>
        <h1 className="text-2xl font-bold md:text-3xl">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </header>

      <div className="space-y-3">
        {checkoutResult === "success" && <Alert><Check className="h-4 w-4" /><AlertDescription>{t("billing.checkoutSuccess")}</AlertDescription></Alert>}
        {checkoutResult === "cancelled" && <Alert><AlertDescription>{t("billing.checkoutCancelled")}</AlertDescription></Alert>}
        {error && (
          <Alert variant="destructive"><AlertDescription className="flex items-center justify-between gap-3"><span>{error}</span><Button type="button" variant="outline" size="sm" onClick={() => void load()}>{t("retry")}</Button></AlertDescription></Alert>
        )}
      </div>

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
                {LANGUAGE_OPTIONS.map((language) => <SelectItem key={language.code} value={language.code}><LanguageOption flagCode={language.flagCode} name={language.name} /></SelectItem>)}
              </SelectContent>
            </Select>
          </label>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6" aria-labelledby="subscription-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2 id="subscription-title" className="text-lg font-semibold">
                {subscription?.active ? t("billing.currentPlan") : t("billing.supportTitle")}
              </h2>
              {subscription?.active && (
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{t("billing.active")}</span>
              )}
            </div>
            {subscription?.active && (
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{t("billing.activeDescription")}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-wrap gap-2.5">
            <Button
              onClick={() => void openStripe()}
              disabled={loading || redirecting || savingAssignment || checkoutUnavailable}
              aria-describedby={checkoutUnavailable ? "subscription-checkout-unavailable" : undefined}
            >
              {(redirecting || savingAssignment) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {subscription?.active ? t("billing.manage") : t("billing.subscribe")}
              {!subscription?.active && <ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" />}
            </Button>
            <Button asChild variant="secondary" className="border-0 bg-muted/65 shadow-sm shadow-black/5 hover:bg-muted">
              <Link href={supportHref}>{t("billing.learnMore")}<ExternalLink className="ml-2 h-4 w-4" aria-hidden="true" /></Link>
            </Button>
          </div>
        </div>

        {checkoutUnavailable && (
          <p id="subscription-checkout-unavailable" className="mt-4 text-sm leading-6 text-muted-foreground">
            {t("billing.checkoutUnavailable")}
          </p>
        )}

        <div className="mt-6 rounded-2xl bg-muted/45 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <label className="text-sm font-medium" htmlFor="subscription-server">{t("billing.assignServer")}</label>
            {!subscription?.active && <LockKeyhole className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
          </div>
          <Select
            value={selectedServerId}
            onValueChange={(value) => void changeServer(value)}
            disabled={loading || savingAssignment || !subscription?.active}
          >
            <SelectTrigger id="subscription-server" className={`mt-2 ${FILLED_SELECT_CLASS}`}><SelectValue placeholder={t("billing.selectServer")} /></SelectTrigger>
            <SelectContent>
              {assignableGuilds.map((guild) => <SelectItem key={guild.id} value={guild.id}><ServerOption guild={guild} /></SelectItem>)}
            </SelectContent>
          </Select>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            {subscription?.active ? t("billing.assignmentHelp") : t("billing.subscriptionRequired")}
          </p>
        </div>
      </section>

      <section className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-6" aria-labelledby="usage-title">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="usage-title" className="font-semibold">{t("usage.title")}</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {paidPool ? t("usage.accountDescription") : selectedGuild ? t("usage.serverName", { name: selectedGuild.name }) : t("usage.serverDescription")}
            </p>
          </div>
          {!paidPool && <InfoPopover label={t("usage.infoLabel")} content={t("usage.freePoolInfo")} />}
        </div>

        {loading && !usage ? <Skeleton className="mt-5 h-20 w-full rounded-2xl" /> : (
          <div className="mt-5 space-y-3">
            <div className="flex items-end justify-between gap-3">
              <p className="text-2xl font-bold tabular-nums">{formatUsd(spent ?? 0, paidPool ? 2 : 3)} <span className="text-xs font-normal text-muted-foreground">{t("usage.used")}</span></p>
              <p className="text-sm tabular-nums">{t("usage.of", { limit: formatUsd(limit ?? 0) })}</p>
            </div>
            <Progress value={usagePercent} aria-label={t("usage.progressLabel", { percent: Math.round(usagePercent) })} />
            <div className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
              <span>{paidPool ? t("usage.subscribers", { count: usage?.assignedSubscriberCount ?? 0 }) : usage?.globalFreeAvailable === false ? t("usage.freePoolUsed") : t("usage.available")}</span>
              <span>{usage?.resetsAt ? t("usage.resets", { date: new Intl.DateTimeFormat(locale, { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(usage.resetsAt)) }) : null}</span>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
