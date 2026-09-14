"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { isPathEnabled } from "@/config/systemSettings";
import { SystemNoticeBanner } from "@/features/shared-platforms/components/SystemNoticeBanner";
import { resolveLandingPage } from "@/features/dashboard/registry";

function subscribeToOnlineStatus(callback: () => void): () => void {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);

  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

function getOnlineSnapshot(): boolean {
  return window.navigator.onLine;
}

function getServerOnlineSnapshot(): boolean {
  return true;
}

export function AppShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSystemSettings();
  const [collapsed, setCollapsed] = useState(settings.appearance.sidebarDefault === "collapsed");
  const online = useSyncExternalStore(
    subscribeToOnlineStatus,
    getOnlineSnapshot,
    getServerOnlineSnapshot
  );

  useEffect(() => {
    if (!isPathEnabled(pathname, settings.modules)) {
      const contextualLanding = resolveLandingPage(user, settings.dashboard);
      router.replace(isPathEnabled(contextualLanding, settings.modules) ? contextualLanding : "/dashboard");
    }
  }, [pathname, router, settings.dashboard, settings.modules, user]);

  return (
    <div className="app-shell">
      <AppSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        pathname={pathname}
        user={user}
      />
      <div className="app-content">
        <AppHeader online={online} pathname={pathname} user={user} />
        <SystemNoticeBanner />
        <main className="page-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <MobileBottomNav pathname={pathname} user={user} />
      </div>
    </div>
  );
}
