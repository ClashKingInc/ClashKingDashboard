"use client";

import Image from "next/image";
import Link from "next/link";

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
      <Image
        src="/concepts/local/assets/icons/Icon_DC_ArrowRight.png"
        alt=""
        width={12}
        height={17}
        className="cs-arrow"
        unoptimized
      />
    </Link>
  );
}
