"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTranslations } from "use-intl";
import { dashboardEndpoints } from "@clashking/api-contracts";
import { executeSharedEndpoint } from "@/lib/api/shared-client";
import { ImageUploadControl } from "./image-upload-control";

export const ImageUploadActivityContext = createContext<(delta: number) => void>(() => {});
const MAX_BYTES = 25 * 1024 * 1024;

export function UploadedImageField({ value, onChange, label }: { value: string; onChange: (url: string) => void; label: string }) {
  const t = useTranslations("EmbedEditor"), common = useTranslations("Common");
  const [busy, setBusy] = useState(false), [error, setError] = useState<string | null>(null);
  const activity = useContext(ImageUploadActivityContext), mounted = useRef(false), latestChange = useRef(onChange);
  latestChange.current = onChange;
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => { if (!busy) return; activity(1); return () => activity(-1); }, [activity, busy]);
  const upload = async (file: File) => {
    if (busy) return;
    if (!/\.(png|jpe?g|gif|webp|svg)$/i.test(file.name) || !file.type.startsWith("image/")) { setError(t("imageUploadType")); return; }
    if (file.size > MAX_BYTES) { setError(t("imageUploadTooLarge")); return; }
    setBusy(true); setError(null);
    try {
      const body = new FormData(); body.append("file", file);
      const response = await executeSharedEndpoint(dashboardEndpoints.dashboardCdnUpload, { path: {}, query: {}, body });
      if (!response.url) throw new Error(t("imageUploadFailed"));
      if (mounted.current) latestChange.current(response.url);
    } catch { if (mounted.current) setError(t("imageUploadFailed")); }
    finally { if (mounted.current) setBusy(false); }
  };
  return <div className="space-y-2"><ImageUploadControl image={value || null} file={null} disabled={busy} label={label}
    chooseLabel={busy ? t("imageUploading") : t("uploadImage")} removeLabel={common("remove")} maxBytes={MAX_BYTES}
    onChoose={file => { void upload(file); }} onRemove={() => { onChange(""); setError(null); }} onTooLarge={() => setError(t("imageUploadTooLarge"))} />
    {busy && <p role="status" className="text-xs text-muted-foreground">{t("imageUploading")}</p>}
    {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
  </div>;
}
