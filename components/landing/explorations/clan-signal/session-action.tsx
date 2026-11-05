"use client";

import Link from "@/components/app-link";

import { useAuthSession } from "@/components/auth-session-provider";

export function LandingSessionAction({
  loginLabel,
  dashboardLabel,
}: Readonly<{
  loginLabel: string;
  dashboardLabel: string;
}>) {
  const { status } = useAuthSession();
  const isAuthenticated = status === "authenticated";

  return (
    <Link
      className="cs-button cs-button-small cs-session-action"
      href={isAuthenticated ? "/servers" : "/login"}
      aria-busy={status === "restoring"}
    >
      {isAuthenticated ? dashboardLabel : loginLabel}

    </Link>
  );
}
