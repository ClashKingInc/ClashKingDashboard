"use client";
import { useState } from "react";
import { useTranslations } from "use-intl";
import { dashboardEndpoints } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogHeader } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DiscordChannel } from "../_lib/types";

export function PostRosterDialog({ serverId, rosterId, channels }: { serverId: string; rosterId: string; channels: DiscordChannel[] }) {
  const t = useTranslations("RostersPage");
  const common = useTranslations("Common");
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState("");
  const [mode, setMode] = useState<"signup" | "post" | "static">("signup");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [messageId, setMessageId] = useState("");
  const [nonce, setNonce] = useState(() => crypto.randomUUID().replaceAll("-", "").slice(0, 25));
  async function post() {
    setBusy(true); setError("");
    try {
      const result = await executeSharedEndpoint(dashboardEndpoints.dashboardPostRoster, {
        path: { serverId, rosterId }, query: {},
        body: { channelId, mode, nonce, dashboardUrl: `${window.location.origin}/dashboard/rosters/detail?guildId=${serverId}&rosterId=${rosterId}`, leaveLabel: t("publication.removeSignup"), joinLabel: t("publication.signup"), viewLabel: common("dashboard") },
      });
      setMessageId(result.messageId);
    } catch (cause) { setError(cause instanceof Error ? cause.message : String(cause)); }
    finally { setBusy(false); }
  }
  return <>
    <Button variant="secondary" onClick={() => { setOpen(true); setMessageId(""); setError(""); setNonce(crypto.randomUUID().replaceAll("-", "").slice(0, 25)); }}>{t("automations.actions.post")}</Button>
    <Dialog open={open} onOpenChange={setOpen}><DialogContent>
      <DialogHeader><DialogTitle>{t("automations.actions.post")}</DialogTitle></DialogHeader>
      <Select value={channelId} disabled={busy || !!messageId} onValueChange={value => { setChannelId(value); setNonce(crypto.randomUUID().replaceAll("-", "").slice(0, 25)); }}>
        <SelectTrigger aria-label={t("automations.channel")}><SelectValue placeholder={t("automations.channel")} /></SelectTrigger>
        <SelectContent>{channels.map(channel => <SelectItem key={channel.id} value={channel.id}>#{channel.name}</SelectItem>)}</SelectContent>
      </Select>
      <Select value={mode} disabled={busy || !!messageId} onValueChange={value => { if (value === "signup" || value === "post" || value === "static") setMode(value); }}>
        <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
          <SelectItem value="signup">{t("automations.actions.openSignup")}</SelectItem>
          <SelectItem value="post">{t("rosterCard.view")}</SelectItem>
          <SelectItem value="static">{t("automations.actions.post")}</SelectItem>
        </SelectContent>
      </Select>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {messageId ? <Button asChild><a href={`https://discord.com/channels/${serverId}/${channelId}/${messageId}`} target="_blank" rel="noreferrer">{t("rosterCard.view")}</a></Button>
        : <Button disabled={!channelId || busy} onClick={post}>{t("automations.actions.post")}</Button>}
    </DialogContent></Dialog>
  </>;
}
