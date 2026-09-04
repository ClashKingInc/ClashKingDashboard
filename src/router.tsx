import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
} from "@tanstack/react-router";
import type { ComponentType } from "react";

import { AuthSessionProvider } from "@/components/auth-session-provider";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { DocumentMetadata } from "@/components/document-metadata";
import { LocaleProvider } from "@/components/locale-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

type PageModule = { default: ComponentType };
type PageImporter = () => Promise<PageModule>;

function RootLayout() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <LocaleProvider>
        <AuthSessionProvider>
          <DocumentMetadata />
          <Outlet />
          <Toaster />
        </AuthSessionProvider>
      </LocaleProvider>
    </ThemeProvider>
  );
}

function DashboardLayout() {
  return (
    <DashboardShell>
      <Outlet />
    </DashboardShell>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: lazyRouteComponent(() => import("@/app/not-found")),
});

function rootPage<const TPath extends string>(path: TPath, importer: PageImporter) {
  return createRoute({
    getParentRoute: () => rootRoute,
    path,
    component: lazyRouteComponent(importer),
  });
}

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "dashboard",
  component: DashboardLayout,
});

function dashboardPage<const TPath extends string>(path: TPath, importer: PageImporter) {
  return createRoute({
    getParentRoute: () => dashboardRoute,
    path,
    component: lazyRouteComponent(importer),
  });
}

const publicRoutes = [
  rootPage("/", () => import("@/app/page")),
  rootPage("features", () => import("@/app/features/page")),
  rootPage("help", () => import("@/app/help/page")),
  rootPage("open-source", () => import("@/app/open-source/page")),
  rootPage("support", () => import("@/app/support/page")),
  rootPage("support-us", () => import("@/app/support-us/page")),
  rootPage("privacy", () => import("@/app/privacy/page")),
  rootPage("terms", () => import("@/app/terms/page")),
  rootPage("fr", () => import("@/app/fr/page")),
  rootPage("fr/privacy", () => import("@/app/fr/privacy/page")),
  rootPage("fr/terms", () => import("@/app/fr/terms/page")),
  rootPage("nl", () => import("@/app/nl/page")),
  rootPage("nl/privacy", () => import("@/app/nl/privacy/page")),
  rootPage("nl/terms", () => import("@/app/nl/terms/page")),
  rootPage("concepts/clan-signal", () => import("@/app/concepts/clan-signal/page")),
] as const;

const applicationRoutes = [
  rootPage("login", () => import("@/app/login/page")),
  rootPage("servers", () => import("@/app/servers/page")),
  rootPage("auth/callback", () => import("@/app/auth/callback/page")),
  rootPage("view", () => import("@/app/view/page")),
  rootPage("roster", () => import("@/app/roster/page")),
] as const;

const dashboardRoutes = [
  dashboardPage("/", () => import("@/app/dashboard/page")),
  dashboardPage("autoboards", () => import("@/app/dashboard/autoboards/page")),
  dashboardPage("bans-and-strikes", () => import("@/app/dashboard/bans-and-strikes/page")),
  dashboardPage("bases", () => import("@/app/dashboard/bases/page")),
  dashboardPage("clans", () => import("@/app/dashboard/clans/page")),
  dashboardPage("embeds", () => import("@/app/dashboard/embeds/page")),
  dashboardPage("family-settings", () => import("@/app/dashboard/family-settings/page")),
  dashboardPage("general", () => import("@/app/dashboard/general/page")),
  dashboardPage("giveaways", () => import("@/app/dashboard/giveaways/page")),
  dashboardPage("graphics", () => import("@/app/dashboard/graphics/page")),
  dashboardPage("links", () => import("@/app/dashboard/links/page")),
  dashboardPage("logs", () => import("@/app/dashboard/logs/page")),
  dashboardPage("panels", () => import("@/app/dashboard/panels/page")),
  dashboardPage("reminders", () => import("@/app/dashboard/reminders/page")),
  dashboardPage("roles", () => import("@/app/dashboard/roles/page")),
  dashboardPage("rosters", () => import("@/app/dashboard/rosters/page")),
  dashboardPage("rosters/builder", () => import("@/app/dashboard/rosters/builder/page")),
  dashboardPage("rosters/compare", () => import("@/app/dashboard/rosters/compare/page")),
  dashboardPage("rosters/cwl-bonuses", () => import("@/app/dashboard/rosters/cwl-bonuses/page")),
  dashboardPage("rosters/detail", () => import("@/app/dashboard/rosters/detail/page")),
  dashboardPage("settings", () => import("@/app/dashboard/settings/page")),
  dashboardPage("settings/billing", () => import("@/app/dashboard/settings/billing/page")),
  dashboardPage("support", () => import("@/app/dashboard/support/page")),
  dashboardPage("support-us", () => import("@/app/dashboard/support-us/page")),
  dashboardPage("tickets", () => import("@/app/dashboard/tickets/page")),
  dashboardPage("tickets/settings", () => import("@/app/dashboard/tickets/settings/page")),
] as const;

const catchAllRoute = rootPage("$", () => import("@/app/not-found"));

const routeTree = rootRoute.addChildren([
  ...publicRoutes,
  ...applicationRoutes,
  dashboardRoute.addChildren([...dashboardRoutes]),
  catchAllRoute,
]);

export const router = createRouter({
  routeTree,
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
