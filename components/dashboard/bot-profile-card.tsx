"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, Pencil, RotateCcw } from "lucide-react";
import { apiClient } from "@/lib/api/client";
import { clashKingAssets } from "@/lib/theme";
import { useDashboardAccess } from "./dashboard-access-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { BotGuildProfile, BotGuildProfileUpdate } from "@/lib/api/types/dashboard-access";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export function BotProfileCard({ guildId }: { guildId: string }) {
  const { canManage } = useDashboardAccess();
  const editable = canManage("settings");
  const [profile, setProfile] = useState<BotGuildProfile | null>(null);
  const [draft, setDraft] = useState<BotGuildProfileUpdate>({});
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<"name" | "bio" | null>(null);
  const failedDraftRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    void apiClient.servers.getBotGuildProfile(guildId).then((response) => {
      if (!active) return;
      if (response.error) setError(response.error);
      else if (response.data) setProfile(response.data);
    });
    return () => { active = false; };
  }, [guildId]);

  useEffect(() => {
    const draftKey = JSON.stringify(draft);
    if (saving || Object.keys(draft).length === 0 || failedDraftRef.current === draftKey) return;
    const timeout = window.setTimeout(() => {
      const snapshot = draft;
      const snapshotKey = JSON.stringify(snapshot);
      setSaving(true);
      setError(null);
      void apiClient.servers.updateBotGuildProfile(guildId, snapshot).then((response) => {
        if (response.error || !response.data) {
          failedDraftRef.current = snapshotKey;
          setError(response.error ?? "Could not update the bot profile");
          setSaving(false);
          return;
        }
        failedDraftRef.current = null;
        setProfile(response.data);
        setDraft((current) => removeSavedDraft(current, snapshot));
        if (snapshot.avatar !== undefined || snapshot.clear_avatar) setPreviewAvatar(null);
        if (snapshot.banner !== undefined || snapshot.clear_banner) setPreviewBanner(null);
        setSaving(false);
      });
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [draft, guildId, saving]);

  const chooseImage = (field: "avatar" | "banner") => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
      setError("Choose a PNG, JPEG, WebP, AVIF, or GIF no larger than 10 MB.");
      return;
    }
    const data = await fileToDataUrl(file);
    setDraft((current) => ({ ...current, [field]: data, [`clear_${field}`]: false }));
    if (field === "avatar") setPreviewAvatar(data); else setPreviewBanner(data);
  };

  const clearDraftField = (field: "name" | "avatar" | "banner" | "bio") => {
    setDraft((current) => {
      const next = { ...current };
      delete next[field];
      delete next[`clear_${field}` as keyof BotGuildProfileUpdate];
      return next;
    });
    if (field === "avatar") setPreviewAvatar(null);
    if (field === "banner") setPreviewBanner(null);
    if (field === editingField) setEditingField(null);
  };

  const resetField = (field: "name" | "avatar" | "banner" | "bio") => {
    const inherited = profile?.[`${field}_inherited` as keyof BotGuildProfile] === true;
    if (inherited) {
      clearDraftField(field);
      return;
    }
    failedDraftRef.current = null;
    setDraft((current) => {
      const next = { ...current };
      delete next[field];
      next[`clear_${field}` as keyof BotGuildProfileUpdate] = true as never;
      return next;
    });
    if (field === "avatar") setPreviewAvatar(null);
    if (field === "banner") setPreviewBanner(null);
    if (field === editingField) setEditingField(null);
  };

  const avatar = previewAvatar ?? profile?.avatar_url ?? clashKingAssets.logos.botApp;
  const banner = previewBanner ?? profile?.banner_url;
  const name = draft.name ?? profile?.name ?? "ClashKing";
  const bio = draft.bio ?? profile?.bio ?? "";
  const canResetName = !draft.clear_name && (draft.name !== undefined || profile?.name_inherited === false);
  const canResetAvatar = !draft.clear_avatar && (draft.avatar !== undefined || profile?.avatar_inherited === false);
  const canResetBanner = !draft.clear_banner && (draft.banner !== undefined || profile?.banner_inherited === false);
  const canResetBio = !draft.clear_bio && (draft.bio !== undefined || profile?.bio_inherited === false);

  return <Card>
    <CardHeader><CardTitle>Bot server profile</CardTitle><CardDescription>Edit the name, avatar, banner, and bio shown only in this Discord server.</CardDescription></CardHeader>
    <CardContent className="space-y-5">
      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
      <div className="overflow-hidden rounded-xl border bg-muted/20">
        <div className="relative h-40 bg-cover bg-center bg-no-repeat bg-gradient-to-r from-primary/20 via-purple-500/15 to-blue-500/20" style={banner ? { backgroundImage: `url(${JSON.stringify(banner)})` } : undefined}>
          {editable && <div className="absolute right-3 top-3 flex gap-2">
            <ProfileImageButton label="Change banner" field="banner" onChange={chooseImage("banner")} />
            <Button type="button" variant="secondary" size="sm" disabled={!canResetBanner} onClick={() => resetField("banner")}><RotateCcw className="mr-2 h-4 w-4" />Use global</Button>
          </div>}
        </div>
        <div className="flex items-start gap-4 px-5 pb-5">
          <div className="-mt-11 w-24 shrink-0">
            <div className="relative h-24 w-24 overflow-hidden rounded-full border-4 border-card bg-card shadow-sm"><Image src={avatar} alt="Bot avatar" fill unoptimized className="object-cover" /></div>
            {editable && <div className="mt-2 flex justify-center gap-1">
              <label htmlFor="bot-avatar" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"><Camera className="h-4 w-4" /><span className="sr-only">Change avatar</span><input id="bot-avatar" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" className="sr-only" onChange={chooseImage("avatar")} /></label>
              <Button type="button" variant="secondary" size="icon" className="h-8 w-8" disabled={!canResetAvatar} onClick={() => resetField("avatar")} aria-label="Use global avatar"><RotateCcw className="h-3.5 w-3.5" /></Button>
            </div>}
          </div>
          <div className="min-w-0 flex-1 space-y-2 pt-3">
            <div className="relative min-h-8 pr-[4.5rem]">
              {editingField === "name" ? <Input autoFocus aria-label="Bot server name" value={name} maxLength={32} onBlur={() => setEditingField(null)} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, clear_name: false }))} className="h-8 w-full text-lg font-semibold" /> : <p className="min-h-7 truncate text-lg font-semibold">{name}</p>}
              {editable && <div className="absolute -right-3 top-0 flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(event) => event.preventDefault()} onClick={() => setEditingField("name")} aria-label="Edit bot server name"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canResetName} onClick={() => resetField("name")} aria-label="Use global bot name"><RotateCcw className="h-3.5 w-3.5" /></Button>
              </div>}
            </div>
            <div className="relative min-h-12 pr-[4.5rem]">
              {editingField === "bio" ? <Textarea autoFocus aria-label="Bot server bio" value={bio} maxLength={190} rows={2} onBlur={() => setEditingField(null)} onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value, clear_bio: false }))} placeholder="Add a short description for this server." className="min-h-16 w-full resize-none text-sm" /> : <p className="whitespace-pre-wrap text-sm text-muted-foreground">{bio || "Add a short description for this server."}</p>}
              {editable && <div className="absolute -right-3 top-0 flex items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(event) => event.preventDefault()} onClick={() => setEditingField("bio")} aria-label="Edit bot server bio"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canResetBio} onClick={() => resetField("bio")} aria-label="Use global bot bio"><RotateCcw className="h-3.5 w-3.5" /></Button>
              </div>}
            </div>
            {editingField === "bio" && <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/190</p>}
          </div>
        </div>
      </div>
      {saving && <p className="text-right text-xs text-muted-foreground">Saving profile…</p>}
    </CardContent>
  </Card>;
}

function removeSavedDraft(current: BotGuildProfileUpdate, saved: BotGuildProfileUpdate): BotGuildProfileUpdate {
  const next = { ...current };
  for (const key of Object.keys(saved) as (keyof BotGuildProfileUpdate)[]) {
    if (next[key] === saved[key]) delete next[key];
  }
  return next;
}

function ProfileImageButton({ label, field, onChange }: { label: string; field: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <Button asChild variant="secondary" size="sm"><label htmlFor={`bot-${field}`} className="cursor-pointer"><Camera className="mr-2 h-4 w-4" />{label}<input id={`bot-${field}`} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" className="sr-only" onChange={onChange} /></label></Button>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
