"use client";

import { SidebarWrapper } from "./sidebar-wrapper";

interface SidebarClientProps {
  readonly guildId: string;
  readonly locale: string;
  readonly variant?: "sidebar" | "mobile-header";
}

export function SidebarClient({ guildId, locale, variant = "sidebar" }: SidebarClientProps) {
  return <SidebarWrapper guildId={guildId} locale={locale} variant={variant} />;
}
