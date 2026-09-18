"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppRail } from "@/components/layout/AppRail";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { BackLink } from "@/components/shared/BackLink";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { isPathEnabled } from "@/config/systemSettings";
import { SystemNoticeBanner } from "@/features/shared-platforms/components/SystemNoticeBanner";
import { resolveLandingPage } from "@/features/dashboard/registry";
import { getBackHref, getBreadcrumbs } from "@/config/routeRegistry";
import { RealtimeProvider, useRealtimeConnectionState } from "@/components/providers/RealtimeProvider";
import { ChatDock } from "@/features/messaging/ChatDock";
import { can } from "@/lib/auth/permissions";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";

const INACTIVITY_TIMEOUT_MS = 12 * 60 * 60 * 1000;

function AppShellContent({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSystemSettings();
  const [collapsed, setCollapsed] = useState(settings.appearance.sidebarDefault === "collapsed");
  const connectionState = useRealtimeConnectionState();
  const breadcrumbs = getBreadcrumbs(pathname);
  const backHref = getBackHref(pathname);

  useEffect(() => {
    if (!isPathEnabled(pathname, settings.modules)) {
      const contextualLanding = resolveLandingPage(user, settings.dashboard);
      router.replace(isPathEnabled(contextualLanding, settings.modules) ? contextualLanding : "/dashboard");
    }
  }, [pathname, router, settings.dashboard, settings.modules, user]);

  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/v1/workspace/preferences", { cache: "no-store", signal: controller.signal }).then(async (response) => {
      if (!response.ok) return;
      const body = await response.json();
      setCollapsed(Boolean(body.data?.sidebarCollapsed));
      if (body.data?.density) document.documentElement.dataset.density = body.data.density === "default" ? "standard" : body.data.density;
    }).catch(() => undefined);
    const update = (event: Event) => {
      const preferences = (event as CustomEvent<{ sidebarCollapsed?: boolean; density?: string }>).detail;
      if (typeof preferences?.sidebarCollapsed === "boolean") setCollapsed(preferences.sidebarCollapsed);
    };
    window.addEventListener("ui-preferences-updated", update);
    return () => { controller.abort(); window.removeEventListener("ui-preferences-updated", update); };
  }, []);

  useEffect(() => {
    const activityKey = `ct:last-activity:${user.id}`;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let lastStoredAt = 0;
    let expiring = false;
    const expire = async () => {
      if (expiring) return;
      expiring = true;
      try { await fetch("/api/v1/auth/logout", { method: "POST" }); }
      finally {
        window.localStorage.removeItem(activityKey);
        router.replace("/login?reason=session-expired");
        router.refresh();
      }
    };
    const schedule = () => {
      if (timer) clearTimeout(timer);
      const stored = Number(window.localStorage.getItem(activityKey));
      const lastActivity = Number.isFinite(stored) && stored > 0 ? stored : Date.now();
      const remaining = INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivity);
      if (remaining <= 0) { void expire(); return; }
      timer = setTimeout(() => void expire(), remaining);
    };
    const markActivity = () => {
      const now = Date.now();
      if (now - lastStoredAt < 60_000) return;
      lastStoredAt = now;
      window.localStorage.setItem(activityKey, String(now));
      schedule();
    };
    window.localStorage.setItem(activityKey, String(Date.now()));
    for (const eventName of ["pointerdown", "keydown", "touchstart"] as const) window.addEventListener(eventName, markActivity, { passive: true });
    window.addEventListener("storage", schedule);
    schedule();
    return () => {
      if (timer) clearTimeout(timer);
      for (const eventName of ["pointerdown", "keydown", "touchstart"] as const) window.removeEventListener(eventName, markActivity);
      window.removeEventListener("storage", schedule);
    };
  }, [pathname, router, user.id]);

  return (
    <div className="app-shell">
      <AppRail
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        pathname={pathname}
        user={user}
      />
      <div className="app-content">
        <AppHeader connectionState={connectionState} pathname={pathname} user={user} />
        <SystemNoticeBanner />
        <main className="page-main" id="main-content" tabIndex={-1}>
          {backHref || breadcrumbs.length > 1 ? (
            <div className="page-context-navigation">
              {backHref ? <BackLink href={backHref} /> : null}
              {breadcrumbs.length > 1 ? <div className="page-breadcrumb"><Breadcrumb items={breadcrumbs} /></div> : null}
            </div>
          ) : null}
          {children}
        </main>
        <MobileBottomNav pathname={pathname} user={user} />
        {can(user.permissions, "chat.access") ? <ChatDock /> : null}
      </div>
    </div>
  );
}

export function AppShell({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  return (
    <CurrentUserProvider user={user}>
      <RealtimeProvider accountId={user.id}><AppShellContent user={user}>{children}</AppShellContent></RealtimeProvider>
    </CurrentUserProvider>
  );
}
