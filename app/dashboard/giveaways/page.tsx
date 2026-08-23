"use client";

import GiveawaysClient from "./GiveawaysClient";
import { useGuildId } from "@/lib/dashboard-route";

export default function GiveawaysPage() {
  const guildId = useGuildId();
  return (
    <GiveawaysClient
      guildId={guildId}
    />
  );
}
