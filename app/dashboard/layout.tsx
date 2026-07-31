import type { Metadata } from "next";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

export const metadata: Metadata = {
  title: "Dashboard | ClashKing",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { readonly children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
