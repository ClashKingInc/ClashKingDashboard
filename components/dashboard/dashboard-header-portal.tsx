"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

export function DashboardHeaderPortal({
  children,
  target = "desktop",
}: {
  readonly children: ReactNode
  readonly target?: "mobile" | "desktop"
}) {
  const [host, setHost] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setHost(document.getElementById(target === "mobile" ? "dashboard-mobile-header-actions" : "dashboard-header-actions"));
  }, [target]);

  return host ? createPortal(children, host) : null;
}
