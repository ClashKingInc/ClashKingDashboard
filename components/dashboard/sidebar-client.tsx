"use client";

import { useEffect, useState } from "react";
import { SidebarWrapper } from "./sidebar-wrapper";

interface SidebarClientProps {
  readonly guildId: string;
}

export function SidebarClient({ guildId }: SidebarClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Render a stable shell until the client has mounted to avoid hydration id mismatches.
  if (!mounted) {
    return <div className="h-full w-64 border-r border-border bg-card" aria-hidden="true" />;
  }

  return <SidebarWrapper guildId={guildId} />;
}
