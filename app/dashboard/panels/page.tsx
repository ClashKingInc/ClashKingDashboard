"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { dashboardHref, useGuildId } from "@/lib/dashboard-route";

export default function PanelsPage() {
  const guildId = useGuildId();
  const router = useRouter();

  useEffect(() => {
    if (!guildId) return;
    const params = new URLSearchParams({ scope: "server", tab: "join-panel" });
    router.replace(dashboardHref("logs", guildId, params));
  }, [guildId, router]);

  return null;
}
