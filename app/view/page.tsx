"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

import { useAuthSession } from "@/components/auth-session-provider";
import { apiClient } from "@/lib/api/client";

export default function SharedRosterViewPage() {
  const router = useRouter();
  const { status } = useAuthSession();
  const [error, setError] = useState<string>();

  useEffect(() => {
    const share = new URL(window.location.href).searchParams.get("share")?.trim();
    if (!share) {
      setError("This shared view link is incomplete.");
      return;
    }
    if (status === "restoring") return;
    if (status === "anonymous") {
      sessionStorage.setItem("auth_return_to", `/view?share=${encodeURIComponent(share)}`);
      router.replace("/login");
      return;
    }
    let active = true;
    void apiClient.rosters.resolveSharedView(share).then((response) => {
      if (!active) return;
      if (response.error || !response.data) {
        setError(response.error ?? "This saved view is unavailable.");
        return;
      }
      router.replace(`/dashboard/rosters/builder?guildId=${encodeURIComponent(response.data.serverId)}&viewId=${encodeURIComponent(response.data.id)}`);
    });
    return () => { active = false; };
  }, [router, status]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      {error ? <p className="text-sm text-destructive">{error}</p> : <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Opening shared view…</div>}
    </main>
  );
}
