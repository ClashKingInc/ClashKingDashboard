import { useTranslations } from "use-intl";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUploadControl } from "@/components/dashboard/image-upload-control";
import { Field, Empty, controlClass, rowClass } from "./ui";
import { competitiveApi, type CompetitiveProfile } from "./api";

export function ProfilePanel() {
  const t = useTranslations("CompetitivePage");
  const queryClient = useQueryClient();
  const profile = useQuery({ queryKey: ["competitive", "profile"], queryFn: ({ signal }) => competitiveApi.profile(signal) });
  if (profile.isPending) return <Empty>{t("loadingYourCompetitiveProfile")}</Empty>;
  if (profile.error) return <p role="alert" className="text-sm text-destructive">{profile.error.message}<Button variant="secondary" className="ml-3" onClick={() => void profile.refetch()}>{t("retry")}</Button></p>;
  if (!profile.data) return null;
  return <ProfileEditor key={profile.data.updatedAt ?? profile.data.userId} profile={profile.data} save={async value => {
    await competitiveApi.saveProfile(value);
    await queryClient.invalidateQueries({ queryKey: ["competitive", "profile"] });
  }} />;
}

function ProfileEditor({ profile, save }: { profile: CompetitiveProfile; save: (value: { displayName: string; avatarUrl: string | null; bannerUrl: string | null; private: boolean; hideDiscord: boolean }) => Promise<void> }) {
  const t = useTranslations("CompetitivePage");
  const [name, setName] = useState(profile.displayName), [avatar, setAvatar] = useState(profile.avatarUrl ?? ""), [banner, setBanner] = useState(profile.bannerUrl ?? "");
  const [privateProfile, setPrivate] = useState(profile.private), [hideDiscord, setHideDiscord] = useState(profile.hideDiscord);
  const [saving, setSaving] = useState(false), [error, setError] = useState(""), [saved, setSaved] = useState(false), [uploading, setUploading] = useState(false);
  const upload = async (file: File, onChange: (url: string) => void) => {
    if (!/^(image\/png|image\/jpeg|image\/webp)$/.test(file.type)) { setError(t("chooseAPNGJPEGOrWebPImage")); return; }
    setUploading(true); setError("");
    try { onChange((await competitiveApi.uploadProfileImage(file)).url); }
    catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotUploadImage")); }
    finally { setUploading(false); }
  };
  return <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(260px,.65fr)]"><form className="space-y-5" onSubmit={async event => {
    event.preventDefault(); setSaving(true); setError(""); setSaved(false);
    try { await save({ displayName: name.trim(), avatarUrl: avatar.trim() || null, bannerUrl: banner.trim() || null, private: privateProfile, hideDiscord }); setSaved(true); }
    catch (cause) { setError(cause instanceof Error && cause.message.trim() ? cause.message.trim() : t("couldNotSaveProfile")); }
    finally { setSaving(false); }
  }}>
    <div><h2 className="text-lg font-semibold">{t("yourCompetitiveIdentity")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("chooseHowOtherPlayersSeeYouLinkedAccountsComeFromYourClashKingAccount")}</p></div>
    <Field label={t("displayName")}><Input required maxLength={50} value={name} onChange={event => setName(event.target.value)} className={controlClass} /></Field>
    <div className="grid gap-5 sm:grid-cols-2">{[{ label: t("avatar"), value: avatar, onChange: setAvatar }, { label: t("banner"), value: banner, onChange: setBanner }].map(image => <div key={image.label} className="space-y-2"><p className="text-sm font-medium">{image.label}</p><ImageUploadControl label={image.label} image={image.value || null} file={null} disabled={saving || uploading} chooseLabel={uploading ? t("uploading") : t("uploadImage", { label: image.label })} removeLabel={t("remove")} maxBytes={5 * 1024 * 1024} onChoose={file => void upload(file, image.onChange)} onRemove={() => image.onChange("")} onTooLarge={() => setError(t("chooseAnImageSmallerThan5MB"))} /></div>)}</div>
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted/35 p-4"><span><span className="block text-sm font-medium">{t("privateProfile")}</span><span className="text-xs text-muted-foreground">{t("keepYourProfileVisibleOnlyToYou")}</span></span><Switch checked={privateProfile} onCheckedChange={setPrivate} /></label>
    <label className="flex items-center justify-between gap-4 rounded-2xl bg-muted/35 p-4"><span><span className="block text-sm font-medium">{t("hideDiscordIdentity")}</span><span className="text-xs text-muted-foreground">{t("keepYourCompetitiveNameSeparateFromYourDiscordHandle")}</span></span><Switch checked={hideDiscord} onCheckedChange={setHideDiscord} /></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}{saved && <p role="status" className="text-sm text-emerald-600">{t("profileSaved")}</p>}
    <Button disabled={saving || uploading || !name.trim()}>{saving ? t("saving") : t("saveProfile")}</Button>
  </form><aside className={`${rowClass} self-start space-y-5`}><div className="flex items-center gap-3"><Avatar className="h-14 w-14"><AvatarImage src={profile.avatarUrl ?? undefined} /><AvatarFallback>{profile.displayName.slice(0, 2)}</AvatarFallback></Avatar><div><h3 className="font-semibold">{profile.displayName}</h3><p className="text-xs text-muted-foreground">{profile.private ? t("privateProfile") : t("publicProfile")}</p></div></div><div><h3 className="text-sm font-semibold">{t("linkedAccounts")}</h3><div className="mt-3 space-y-2">{profile.accounts.length ? profile.accounts.map(account => <div key={account.tag} className="rounded-xl bg-muted/45 p-3 text-sm"><span className="font-medium">{account.name || account.tag}</span><span className="ml-2 text-xs text-muted-foreground">{account.tag}</span></div>) : <p className="text-sm text-muted-foreground">{t("noLinkedAccountsYet")}</p>}</div></div><p className="text-xs leading-5 text-muted-foreground">{t("teamMembershipsFollowVerifiedPlayerAccountsOrganizersRetainEventRosterSnapshotsAndAuditedResults")}</p></aside></div>;
}
