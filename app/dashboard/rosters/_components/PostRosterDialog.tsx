"use client";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { dashboardEndpoints } from "@clashking/api-contracts";
import { executeSharedApiResult } from "@/lib/api/shared-client";
import { normalizeChannelsPayload } from "@/lib/dashboard-cache";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DiscordChannel } from "../_lib/types";

const newNonce = () => crypto.randomUUID().replaceAll("-", "").slice(0, 25);
const uncertainPostMessage = "Publication status is uncertain. Check the destination channel and reconcile any existing post before starting another publication.";

export function PostRosterDialog({ serverId, rosterId, channels }: { serverId: string; rosterId: string; channels: DiscordChannel[] }) {
  const t = useTranslations("RostersPage");
  const common = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [mode, setMode] = useState<"signup" | "post" | "static">("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messageId, setMessageId] = useState("");
  const [nonce, setNonce] = useState(newNonce);
  const [uncertain, setUncertain] = useState(false);
  const messageableChannels = normalizeChannelsPayload(channels);
  const validChannel = messageableChannels.some((channel) => channel.id === channelId);
  async function post() {
    if (uncertain || !validChannel) return;
    setBusy(true); setError("");
    try {
      const result = await executeSharedApiResult(dashboardEndpoints.dashboardPostRoster, {
        path: { serverId, rosterId }, query: {},
        body: { channelId, mode, nonce, dashboardUrl: `${window.location.origin}/dashboard/rosters/detail?guildId=${serverId}&rosterId=${rosterId}`, leaveLabel: t("publication.removeSignup"), joinLabel: t("publication.signup"), viewLabel: common("dashboard") },
      });
      if (result.data) {
        setMessageId(result.data.messageId);
      } else {
        const pending = result.status === 409 && typeof result.errorData === "object" && result.errorData !== null
          && "reason" in result.errorData && result.errorData.reason === "publication_pending";
        const ambiguous = pending || result.status === 0 || result.status >= 500;
        if (ambiguous) setUncertain(true);
        setError(ambiguous ? uncertainPostMessage : result.error || "Unable to post roster.");
      }
    } catch { setUncertain(true); setError(uncertainPostMessage); }
    finally { setBusy(false); }
  }
  return <>
    <Button variant="secondary" onClick={() => { setOpen(true); if (!uncertain) { setMessageId(""); setError(""); setNonce(newNonce()); } }}>{t("automations.actions.post")}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>{t("automations.actions.post")}</DialogTitle></DialogHeader>
      <Select value={channelId} disabled={busy || !!messageId || uncertain} onValueChange={value => { setChannelId(value); setNonce(newNonce()); }}>
        <SelectTrigger aria-label={t("automations.channel")}><SelectValue placeholder={t("automations.channel")} /></SelectTrigger>
        <SelectContent>{messageableChannels.map(channel => <SelectItem key={channel.id} value={channel.id}>#{channel.name}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={mode} disabled={busy || !!messageId || uncertain} onValueChange={value => { if (value === "signup" || value === "post" || value === "static") setMode(value); }}>
        <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="signup">{t("automations.actions.openSignup")}</SelectItem>
          <SelectItem value="post">{t("rosterCard.view")}</SelectItem>
          <SelectItem value="static">{t("automations.actions.post")}</SelectItem>
        </SelectContent>
      </Select>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {uncertain && <Button variant="outline" onClick={() => { setUncertain(false); setError(""); setNonce(newNonce()); }}>I checked the channel; start a new post</Button>}
      {messageId ? <Button asChild><a href={`https://discord.com/channels/${serverId}/${channelId}/${messageId}`} target="_blank" rel="noreferrer">{t("rosterCard.view")}</a></Button>
        : <Button disabled={!validChannel || busy || uncertain} onClick={post}>{t("automations.actions.post")}</Button>}
    </DialogContent></Dialog>
  </>;
}
