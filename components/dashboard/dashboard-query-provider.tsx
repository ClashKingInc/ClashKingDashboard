"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { dashboardQueryClientConfig } from "@/lib/dashboard-query";

export function DashboardQueryProvider({ children }: { readonly children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient(dashboardQueryClientConfig));
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
