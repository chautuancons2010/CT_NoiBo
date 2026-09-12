"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { foundationDemoUser } from "@/lib/auth/currentUser";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { isPathEnabled } from "@/config/systemSettings";

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

export function AppShell({ children }: { children: ReactNode }) {
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
      router.replace(settings.navigation.defaultLandingPage);
    }
  }, [pathname, router, settings.modules, settings.navigation.defaultLandingPage]);

  return (
    <div className="app-shell">
      <AppSidebar
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        pathname={pathname}
        user={foundationDemoUser}
      />
      <div className="app-content">
        <AppHeader online={online} pathname={pathname} user={foundationDemoUser} />
        <main className="page-main" id="main-content" tabIndex={-1}>
          {children}
        </main>
        <MobileBottomNav pathname={pathname} user={foundationDemoUser} />
      </div>
    </div>
  );
}
