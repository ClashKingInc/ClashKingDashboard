"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { dashboardHref, useGuildId } from "@/lib/dashboard-route";

export default function TicketsSettingsRedirect() {
  const router = useRouter();
  const guildId = useGuildId();
  useEffect(() => {
    if (guildId) router.replace(dashboardHref("tickets", guildId));
  }, [guildId, router]);
  return null;
}
