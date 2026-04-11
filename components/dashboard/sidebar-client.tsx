"use client";

import { SidebarWrapper } from "./sidebar-wrapper";

interface SidebarClientProps {
  readonly guildId: string;
  readonly locale: string;
}

export function SidebarClient({ guildId, locale }: SidebarClientProps) {
  return <SidebarWrapper guildId={guildId} locale={locale} />;
}
