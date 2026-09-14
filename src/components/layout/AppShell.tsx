"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { isPathEnabled } from "@/config/systemSettings";
import { SystemNoticeBanner } from "@/features/shared-platforms/components/SystemNoticeBanner";
import { resolveLandingPage } from "@/features/dashboard/registry";
import { getBreadcrumbs } from "@/config/routeRegistry";
import { RealtimeProvider, useRealtimeConnectionState } from "@/components/providers/RealtimeProvider";
import { realtimeDomainForPath } from "@/lib/realtime/routeDomain";
import { subscribeRealtimeDomain } from "@/lib/realtime/coordinator";

function AppShellContent({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSystemSettings();
  const [collapsed, setCollapsed] = useState(settings.appearance.sidebarDefault === "collapsed");
  const isWorkspace = pathname === "/workspace";
  const connectionState = useRealtimeConnectionState();

  useEffect(() => {
    if (!isPathEnabled(pathname, settings.modules)) {
      const contextualLanding = resolveLandingPage(user, settings.dashboard);
      router.replace(isPathEnabled(contextualLanding, settings.modules) ? contextualLanding : "/dashboard");
    }
  }, [pathname, router, settings.dashboard, settings.modules, user]);

  useEffect(() => {
    const domain = realtimeDomainForPath(pathname);
    if (!domain) return;
    return subscribeRealtimeDomain(domain, () => router.refresh());
  }, [pathname, router]);

  return (
    <div className={isWorkspace ? "app-shell app-shell--workspace" : "app-shell"}>
      {!isWorkspace ? <AppSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        pathname={pathname}
        user={user}
      /> : null}
      <div className="app-content">
        <AppHeader connectionState={connectionState} pathname={pathname} user={user} />
        <SystemNoticeBanner />
        <main className="page-main" id="main-content" tabIndex={-1}>
          {!isWorkspace ? <div className="page-breadcrumb"><Breadcrumb items={getBreadcrumbs(pathname)} /></div> : null}
          {children}
        </main>
        <MobileBottomNav pathname={pathname} user={user} />
      </div>
    </div>
  );
}

export function AppShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  return <RealtimeProvider accountId={user.id}><AppShellContent user={user}>{children}</AppShellContent></RealtimeProvider>;
}
