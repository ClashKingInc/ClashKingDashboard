"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import { useTranslations } from "next-intl";

import { useAuthSession } from "@/components/auth-session-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  buildConnectReturnUrl,
  CONNECT_PERMISSION,
  readConnectRequest,
  type ConnectedAppSelectionMode,
  type ConnectRequestContext,
  type ConnectResultStatus,
} from "@/lib/connected-apps";
import { apiClient } from "@/lib/api/client";
import type {
  ConnectedApplication,
  ConnectedAppGrantDetails,
} from "@/lib/api/types/connected-apps";
import { clashKingAssets } from "@/lib/theme";

type PageResult = { status: ConnectResultStatus; applicationName: string };

const selectionModes: ConnectedAppSelectionMode[] = [
  "selected",
  "all_current",
  "all_current_and_future",
];

function ConnectShell({ children }: { readonly children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background px-4 py-8 sm:grid sm:place-items-center sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-7 flex items-center justify-center gap-3">
          <Image
            src={clashKingAssets.logos.darkBgPng}
            alt=""
            width={44}
            height={44}
            className="h-11 w-11 object-contain dark:block"
          />
          <span className="text-xl font-bold">ClashKing</span>
        </div>
        {children}
      </div>
    </main>
  );
}

function ConnectLoading() {
  return (
    <ConnectShell>
      <div className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-7">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="mt-3 h-5 w-full" />
        <Skeleton className="mt-8 h-24 w-full rounded-2xl" />
        <Skeleton className="mt-3 h-24 w-full rounded-2xl" />
      </div>
    </ConnectShell>
  );
}

export default function ConnectApplicationPage() {
  const t = useTranslations("ConnectedApps.connect");
  const invalidUrlMessage = t("invalidUrl");
  const loadErrorMessage = t("loadError");
  const router = useRouter();
  const { status: authStatus } = useAuthSession();
  const [request, setRequest] = useState<ConnectRequestContext | null>();
  const [details, setDetails] = useState<ConnectedAppGrantDetails | null>(null);
  const [application, setApplication] = useState<ConnectedApplication | null>(null);
  const [selectionMode, setSelectionMode] = useState<ConnectedAppSelectionMode>("all_current_and_future");
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<PageResult | null>(null);

  useEffect(() => {
    setRequest(readConnectRequest(new URL(globalThis.location.href)));
  }, []);

  useEffect(() => {
    if (request === undefined || authStatus === "restoring") return;
    if (!request) {
      setError(invalidUrlMessage);
      return;
    }
    if (authStatus === "anonymous") {
      sessionStorage.setItem("auth_return_to", `${globalThis.location.pathname}${globalThis.location.search}`);
      router.replace("/login");
      return;
    }

    let active = true;
    const load = async () => {
      setError(null);
      const metadataResponse = await apiClient.connectedApps.getApplication(
        request.applicationId,
        request.redirectUri,
      );
      if (!active) return;
      if (metadataResponse.error || !metadataResponse.data) {
        setError(metadataResponse.error ?? loadErrorMessage);
        return;
      }
      setApplication(metadataResponse.data.application);

      const grantResponse = await apiClient.connectedApps.getGrant(request.applicationId);
      if (!active) return;
      if (grantResponse.error || !grantResponse.data) {
        setError(grantResponse.error ?? loadErrorMessage);
        return;
      }

      const nextDetails = grantResponse.data;
      setDetails(nextDetails);
      setApplication(nextDetails.application);
      if (nextDetails.grant?.access_mode === "all_current_and_future") {
        setSelectionMode("all_current_and_future");
        setSelectedTags(new Set());
      } else if (nextDetails.grant) {
        setSelectionMode("selected");
        setSelectedTags(new Set(nextDetails.grant.selected_player_tags));
      }
    };
    void load();
    return () => { active = false; };
  }, [authStatus, invalidUrlMessage, loadErrorMessage, request, router]);

  const eligibleTags = useMemo(
    () => new Set(details?.accounts.map((account) => account.player_tag) ?? []),
    [details?.accounts],
  );
  const validSelectedTags = [...selectedTags].filter((tag) => eligibleTags.has(tag));
  const canConnect = selectionMode === "all_current_and_future" ||
    (selectionMode === "all_current" && eligibleTags.size > 0) ||
    (selectionMode === "selected" && validSelectedTags.length > 0);

  const finish = (status: ConnectResultStatus) => {
    if (!request || !application) return;
    if (request.redirectUri) {
      globalThis.location.assign(buildConnectReturnUrl(request.redirectUri, status, request.state));
      return;
    }
    setResult({ status, applicationName: application.name });
  };

  const connect = async () => {
    if (!request || !application || !canConnect) return;
    setSubmitting(true);
    setError(null);
    const playerTags = selectionMode === "all_current"
      ? [...eligibleTags]
      : validSelectedTags;
    const response = await apiClient.connectedApps.updateGrant(
      request.applicationId,
      selectionMode === "all_current_and_future"
        ? { access_mode: "all_current_and_future" }
        : { access_mode: "selected", player_tags: playerTags },
    );
    setSubmitting(false);
    if (response.error) {
      if (request.redirectUri) {
        finish("error");
      } else {
        setError(response.error);
      }
      return;
    }
    finish("connected");
  };

  if (request === undefined || authStatus === "restoring" || (authStatus === "authenticated" && !details && !error)) {
    return <ConnectLoading />;
  }

  if (result) {
    const connected = result.status === "connected";
    return (
      <ConnectShell>
        <section className="rounded-3xl bg-card p-6 text-center shadow-sm shadow-black/5 sm:p-8">
          <div className={`mx-auto grid h-12 w-12 place-items-center rounded-full ${connected ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}>
            {connected ? <Check aria-hidden="true" /> : <X aria-hidden="true" />}
          </div>
          <h1 className="mt-5 text-2xl font-bold">
            {connected ? t("result.connectedTitle") : t("result.deniedTitle")}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">
            {connected
              ? t("result.connectedDescription", { application: result.applicationName })
              : t("result.deniedDescription", { application: result.applicationName })}
          </p>
          <Button className="mt-6" variant="secondary" onClick={() => globalThis.location.assign("https://clashk.ing")}>
            {t("result.done")}
          </Button>
        </section>
      </ConnectShell>
    );
  }

  if (!details || !application) {
    return (
      <ConnectShell>
        <Alert variant="destructive" className="bg-card shadow-sm shadow-black/5">
          <AlertDescription>{error ?? t("loadError")}</AlertDescription>
        </Alert>
      </ConnectShell>
    );
  }

  const toggleTag = (tag: string, checked: boolean) => {
    setSelectedTags((current) => {
      const next = new Set(current);
      if (checked) next.add(tag); else next.delete(tag);
      return next;
    });
  };

  return (
    <ConnectShell>
      <section className="rounded-3xl bg-card p-5 shadow-sm shadow-black/5 sm:p-7">
        <header>
          <p className="text-sm font-medium text-primary">{t("eyebrow")}</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{t("title", { application: application.name })}</h1>
          {application.developer_name && (
            <p className="mt-1 text-sm text-muted-foreground">
              {t("byDeveloper", { developer: application.developer_name })}
            </p>
          )}
        </header>

        <div className="mt-6 flex items-start gap-3 rounded-2xl bg-muted/45 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="font-medium">{CONNECT_PERMISSION}</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{t("permissionDescription")}</p>
          </div>
        </div>

        <fieldset className="mt-7 space-y-3">
          <legend className="font-semibold">{t("chooseAccess")}</legend>
          {selectionModes.map((mode) => (
            <label
              key={mode}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl p-4 transition-[background-color,box-shadow] duration-150 ${selectionMode === mode ? "bg-primary/10 shadow-sm shadow-black/5" : "bg-muted/45 hover:bg-muted/65"}`}
            >
              <input
                type="radio"
                name="account-access"
                value={mode}
                checked={selectionMode === mode}
                onChange={() => setSelectionMode(mode)}
                className="mt-1 h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
              <span>
                <span className="block font-medium">{t(`modes.${mode}.title`)}</span>
                <span className="mt-1 block text-sm leading-6 text-muted-foreground">{t(`modes.${mode}.description`)}</span>
              </span>
            </label>
          ))}
        </fieldset>

        {selectionMode === "selected" && (
          <div className="mt-5 rounded-2xl bg-muted/30 p-3 sm:p-4">
            <p className="px-1 text-sm font-medium">{t("accountsTitle")}</p>
            {details.accounts.length === 0 ? (
              <p className="px-1 pt-3 text-sm text-muted-foreground">{t("noLinkedAccounts")}</p>
            ) : (
              <div className="mt-2 space-y-2">
                {details.accounts.map((account) => (
                  <label key={account.player_tag} className="flex cursor-pointer items-center gap-3 rounded-xl bg-card px-3 py-3 shadow-sm shadow-black/5">
                    <Checkbox
                      checked={selectedTags.has(account.player_tag)}
                      onCheckedChange={(checked) => toggleTag(account.player_tag, checked === true)}
                      aria-label={t("shareAccount", { name: account.name })}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{account.name}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{account.player_tag}</span>
                      <span className="mt-2 flex flex-wrap gap-1.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${account.is_verified ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}>
                          {account.is_verified ? t("status.verified") : t("status.unverified")}
                        </span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {account.hidden ? t("status.hidden") : t("status.visible")}
                        </span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="mt-5">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="secondary" onClick={() => finish("denied")} disabled={submitting}>
            {t("deny")}
          </Button>
          <Button type="button" onClick={() => void connect()} disabled={!canConnect || submitting}>
            {submitting && <Loader2 className="animate-spin" aria-hidden="true" />}
            {t("connect")}
          </Button>
        </div>
      </section>
    </ConnectShell>
  );
}
