"use client";

import Image from "@/components/app-image";
import { useTranslations } from "use-intl";
import { SUPPORT_DISCORD_URL } from "@/lib/support";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { Camera, Check, Loader2, LockKeyhole, Pencil, RotateCcw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import { apiClient } from "@/lib/api/client";
import { clashKingAssets } from "@/lib/theme";
import { useDashboardAccess } from "./dashboard-access-provider";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { BotGuildProfile, BotGuildProfileUpdate } from "@/lib/api/types/dashboard-access";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

const BIO_MARKDOWN_COMPONENTS: Components = {
  p: ({ children }) => <p className="break-words [overflow-wrap:anywhere]">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  h1: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
  h2: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
  h3: ({ children }) => <p className="font-semibold text-foreground">{children}</p>,
  ul: ({ children }) => <ul className="ml-5 list-disc">{children}</ul>,
  ol: ({ children }) => <ol className="ml-5 list-decimal">{children}</ol>,
  blockquote: ({ children }) => <blockquote className="border-l-2 border-muted-foreground/40 pl-2">{children}</blockquote>,
  a: ({ href, children }) => <a href={href} className="text-primary underline underline-offset-2" target="_blank" rel="noreferrer">{children}</a>,
  code: ({ children }) => <code className="rounded bg-muted px-1 py-0.5 text-[0.9em] text-foreground">{children}</code>,
};

export function BotProfileBio({ children }: { children: string }) {
  return <div data-slot="bot-profile-bio" className="break-words whitespace-pre-wrap text-sm text-muted-foreground [overflow-wrap:anywhere] [&>*:not(:first-child)]:mt-1">
    <ReactMarkdown components={BIO_MARKDOWN_COMPONENTS}>{children}</ReactMarkdown>
  </div>;
}

export function BotProfileCard({ guildId }: { guildId: string }) {
  const { canManage } = useDashboardAccess();
  const tGrant = useTranslations("BotCustomizationGrant");
  const canManageSettings = canManage("settings");
  const scope=useRef(0);
  const [loading,setLoading]=useState(true),[loadRetry,setLoadRetry]=useState(0),[saveRetry,setSaveRetry]=useState(0),[saved,setSaved]=useState(false);
  const [customizationEnabled, setCustomizationEnabled] = useState(false);
  const editable = canManageSettings && customizationEnabled;
  const [profile, setProfile] = useState<BotGuildProfile | null>(null);
  const [draft, setDraft] = useState<BotGuildProfileUpdate>({});
  const [previewAvatar, setPreviewAvatar] = useState<string | null>(null);
  const [previewBanner, setPreviewBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingField, setEditingField] = useState<"name" | "bio" | null>(null);
  const failedDraftRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;const version=++scope.current;
    setLoading(true);setError(null);setProfile(null);setPreviewAvatar(null);setPreviewBanner(null);setSaving(false);setSaved(false);failedDraftRef.current=null;
    setCustomizationEnabled(false);
    setDraft({});
    setEditingField(null);
    void Promise.all([apiClient.servers.getBotGuildProfile(guildId), apiClient.servers.getResourceLimits(guildId)]).then(([profileResponse, limitsResponse]) => {
      if (!active || scope.current!==version) return;
      if(!profileResponse.data||!limitsResponse.data)throw new Error(profileResponse.error??limitsResponse.error??"Could not load profile settings");
      if (profileResponse.error) setError(profileResponse.error);
      else if (profileResponse.data) setProfile(profileResponse.data);
      setCustomizationEnabled(limitsResponse.data?.botCustomizationEnabled === true);
      if (limitsResponse.error) setError(limitsResponse.error);
    }).catch(cause=>{if(active&&scope.current===version)setError(cause instanceof Error?cause.message:"Could not load the bot profile");}).finally(()=>{if(active&&scope.current===version)setLoading(false);});
    return () => { active = false;scope.current++; };
  }, [guildId,loadRetry]);

  useEffect(() => {
    const draftKey = JSON.stringify(draft);
    if (!editable || saving || Object.keys(draft).length === 0 || failedDraftRef.current === draftKey) return;
    const timeout = window.setTimeout(() => {
      const snapshot = draft;
      const snapshotKey = JSON.stringify(snapshot);
      const version=scope.current;
      setSaving(true);setSaved(false);
      setError(null);
      void apiClient.servers.updateBotGuildProfile(guildId, snapshot).then((response) => {
        if(version!==scope.current)return;
        if (response.error || !response.data) {
          failedDraftRef.current = snapshotKey;
          setError(response.error ?? "Could not update the bot profile");
          setSaving(false);
          return;
        }
        failedDraftRef.current = null;
        setProfile(response.data);
        setDraft((current) => removeSavedDraft(current, snapshot));
        if (snapshot.avatar !== undefined || snapshot.clear_avatar) setPreviewAvatar(current=>current===snapshot.avatar||snapshot.clear_avatar&&!current?null:current);
        if (snapshot.banner !== undefined || snapshot.clear_banner) setPreviewBanner(current=>current===snapshot.banner||snapshot.clear_banner&&!current?null:current);
        setSaving(false);setSaved(true);
      }).catch(cause=>{
        if(version!==scope.current)return;failedDraftRef.current=snapshotKey;setError(cause instanceof Error?cause.message:"Could not update the bot profile");setSaving(false);
      });
    }, 800);
    return () => window.clearTimeout(timeout);
  }, [draft, guildId, saving, editable,saveRetry]);

  const chooseImage = (field: "avatar" | "banner") => async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > MAX_IMAGE_BYTES) {
      setError("Choose a PNG, JPEG, WebP, AVIF, or GIF no larger than 10 MB.");
      return;
    }
    const version=scope.current;
    let data:string;
    try{data=await fileToDataUrl(file);}catch{if(version===scope.current)setError("Could not read the image. Choose the file again.");return;}
    if(version!==scope.current)return;
    setSaved(false);
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

  if(loading)return <section aria-label="Loading bot profile" aria-busy="true" className="space-y-3"><Skeleton className="h-7 w-40" /><Skeleton className="h-64 rounded-3xl" /></section>;
  if(!profile || error&&!customizationEnabled)return <section className="space-y-3"><h2 className="text-lg font-semibold">Bot server profile</h2><p role="alert" className="text-sm text-destructive">{error??"Could not load the bot profile"}<Button variant="secondary" className="ml-2" onClick={()=>setLoadRetry(value=>value+1)}>Retry</Button></p></section>;
  return <section className="min-w-0 max-w-full space-y-3">
    <div className="min-w-0">
      <div className="flex items-center gap-2"><h2 className="text-lg font-semibold">Bot server profile</h2>
        {canManageSettings && !customizationEnabled && <Dialog><DialogTrigger asChild><Button type="button" variant="ghost" size="touch-icon" className="text-muted-foreground" aria-label={tGrant("required")}><LockKeyhole className="h-4 w-4" /></Button></DialogTrigger><DialogContent><DialogHeader><DialogTitle>{tGrant("required")}</DialogTitle><DialogDescription>{tGrant("request")}</DialogDescription></DialogHeader><Button asChild><a href={SUPPORT_DISCORD_URL} target="_blank" rel="noopener noreferrer">{tGrant("action")}</a></Button></DialogContent></Dialog>}
      </div>
      {!canManageSettings && <p className="text-xs text-muted-foreground">Read only. Settings manage permission is required to edit this profile.</p>}
    </div>
    <div className="min-w-0 max-w-full space-y-4">
      {error && <Alert variant="destructive"><AlertDescription>{error}<Button size="sm" variant="secondary" className="ml-2" onClick={()=>{failedDraftRef.current=null;setSaveRetry(value=>value+1);}}>Retry</Button></AlertDescription></Alert>}
      <div data-slot="bot-profile-card" className="min-w-0 max-w-full overflow-hidden rounded-[24px] bg-card shadow-sm shadow-black/5">
        <div className="relative h-32 bg-cover bg-center bg-no-repeat bg-gradient-to-r from-primary/20 via-purple-500/15 to-blue-500/20 sm:h-40" style={banner ? { backgroundImage: `url(${JSON.stringify(banner)})` } : undefined}>
          {editable && <div className="absolute inset-x-3 top-3 flex min-w-0 justify-end gap-2">
            <ProfileImageButton label="Change banner" field="banner" onChange={chooseImage("banner")} />
            <Button type="button" variant="secondary" size="sm" className="h-9 w-9 px-0 sm:h-8 sm:w-auto sm:px-3" disabled={!canResetBanner} onClick={() => resetField("banner")} aria-label="Use global banner"><RotateCcw className="h-4 w-4 sm:mr-2" /><span className="hidden sm:inline">Use global</span></Button>
          </div>}
        </div>
        <div data-slot="bot-profile-body" className="flex min-w-0 flex-col px-4 pb-4 sm:flex-row sm:items-start sm:gap-4 sm:px-5 sm:pb-5">
          <div className="-mt-10 w-20 shrink-0 sm:-mt-11 sm:w-24">
            <div className="relative h-20 w-20 overflow-hidden rounded-full border-4 border-card bg-card shadow-sm sm:h-24 sm:w-24"><Image src={avatar} alt="Bot avatar" fill unoptimized className="object-cover" /></div>
            {editable && <div className="mt-2 flex justify-center gap-1">
              <label htmlFor="bot-avatar" className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-md bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80"><Camera className="h-4 w-4" /><span className="sr-only">Change avatar</span><input id="bot-avatar" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" className="sr-only" onChange={chooseImage("avatar")} /></label>
              <Button type="button" variant="secondary" size="icon" className="h-8 w-8" disabled={!canResetAvatar} onClick={() => resetField("avatar")} aria-label="Use global avatar"><RotateCcw className="h-3.5 w-3.5" /></Button>
            </div>}
          </div>
          <div className="min-w-0 w-full flex-1 space-y-2 pt-2 sm:pt-3">
            <div className="flex min-h-8 min-w-0 items-start gap-1">
              <div className="min-w-0 flex-1">
                {editingField === "name" ? <Input autoFocus aria-label="Bot server name" value={name} maxLength={32} onBlur={() => setEditingField(null)} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value, clear_name: false }))} className="h-8 w-full text-lg font-semibold" /> : <p className="min-h-7 truncate text-lg font-semibold">{name}</p>}
              </div>
              {editable && <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(event) => event.preventDefault()} onClick={() => setEditingField("name")} aria-label="Edit bot server name"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canResetName} onClick={() => resetField("name")} aria-label="Use global bot name"><RotateCcw className="h-3.5 w-3.5" /></Button>
              </div>}
            </div>
            <div className="flex min-h-12 min-w-0 items-start gap-1">
              <div className="min-w-0 flex-1">
                {editingField === "bio" ? <Textarea autoFocus aria-label="Bot server bio" value={bio} maxLength={190} rows={2} onBlur={() => setEditingField(null)} onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value, clear_bio: false }))} placeholder="Add a short description for this server." className="min-h-16 w-full resize-none text-sm" /> : <BotProfileBio>{bio || "Add a short description for this server."}</BotProfileBio>}
              </div>
              {editable && <div className="flex shrink-0 items-center gap-1">
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onMouseDown={(event) => event.preventDefault()} onClick={() => setEditingField("bio")} aria-label="Edit bot server bio"><Pencil className="h-3.5 w-3.5" /></Button>
                <Button type="button" variant="ghost" size="icon" className="h-8 w-8" disabled={!canResetBio} onClick={() => resetField("bio")} aria-label="Use global bot bio"><RotateCcw className="h-3.5 w-3.5" /></Button>
              </div>}
            </div>
            {editingField === "bio" && <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/190</p>}
          </div>
        </div>

      </div>
      <div role="status" className="flex h-6 items-center justify-end gap-1.5 text-xs text-muted-foreground">{saving?<><Loader2 className="h-3.5 w-3.5 animate-spin" />Saving profile…</>:Object.keys(draft).length?"Changes pending…":saved?<><Check className="h-3.5 w-3.5 text-emerald-500" />Saved</>:null}</div>
    </div>
  </section>;
}

function removeSavedDraft(current: BotGuildProfileUpdate, saved: BotGuildProfileUpdate): BotGuildProfileUpdate {
  const next = { ...current };
  for (const key of Object.keys(saved) as (keyof BotGuildProfileUpdate)[]) {
    if (next[key] === saved[key]) delete next[key];
  }
  return next;
}

function ProfileImageButton({ label, field, onChange }: { label: string; field: string; onChange: (event: ChangeEvent<HTMLInputElement>) => void }) {
  return <Button asChild variant="secondary" size="sm" className="h-9 w-9 px-0 sm:h-8 sm:w-auto sm:px-3"><label htmlFor={`bot-${field}`} className="cursor-pointer"><Camera className="h-4 w-4 sm:mr-2" /><span className="sr-only sm:not-sr-only">{label}</span><input id={`bot-${field}`} type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" className="sr-only" onChange={onChange} /></label></Button>;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image"));
    reader.readAsDataURL(file);
  });
}
