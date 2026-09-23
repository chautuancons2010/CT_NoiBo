"use client";

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { AppHeader } from "@/components/layout/AppHeader";
import { AppRail } from "@/components/layout/AppRail";
import { MobileContextNav } from "@/components/layout/MobileContextNav";
import { BackLink } from "@/components/shared/BackLink";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { isPathEnabled } from "@/config/systemSettings";
import { SystemNoticeBanner } from "@/features/shared-platforms/components/SystemNoticeBanner";
import { resolveLandingPage } from "@/features/dashboard/registry";
import { getBackHref } from "@/config/routeRegistry";
import { RealtimeProvider, useRealtimeConnectionState } from "@/components/providers/RealtimeProvider";
import { ChatDock } from "@/features/messaging/ChatDock";
import { can } from "@/lib/auth/permissions";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { visibleApplications } from "@/config/moduleRegistry";

const INACTIVITY_TIMEOUT_MS = 12 * 60 * 60 * 1000;

function AppShellContent({ children, user }: { children: ReactNode; user: AuthenticatedUser }) {
  const pathname = usePathname();
  const router = useRouter();
  const { settings } = useSystemSettings();
  const [collapsed, setCollapsed] = useState(settings.appearance.sidebarDefault === "collapsed");
  const [hasLocalBackLink, setHasLocalBackLink] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const connectionState = useRealtimeConnectionState();
  // The shared shell owns the fallback return control. A locally-declared
  // BackLink (for a wizard or a record with a specific parent) wins, so users
  // never see two competing return actions.
  const backHref = pathname === "/dashboard" ? null : getBackHref(pathname) ?? "/dashboard";
  const hasChatAccess = can(user.permissions, "chat.access");

  useEffect(() => {
    if (!isPathEnabled(pathname, settings.modules)) {
      const contextualLanding = resolveLandingPage(user, settings.dashboard);
      const enabledLanding = visibleApplications(user, settings.modules)[0]?.defaultRoute ?? "/profile";
      router.replace(isPathEnabled(contextualLanding, settings.modules) ? contextualLanding : enabledLanding);
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

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    const findLocalBackLink = () => {
      setHasLocalBackLink(Boolean(main.querySelector(":scope > :not(.page-context-navigation) .back-link")));
    };
    findLocalBackLink();
    const observer = new MutationObserver(findLocalBackLink);
    observer.observe(main, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <div className="app-shell">
      <AppRail
        collapsed={collapsed}
        onCollapsedChange={setCollapsed}
        pathname={pathname}
        user={user}
      />
      <div className={hasChatAccess ? "app-content app-content--chat" : "app-content"}>
        <AppHeader connectionState={connectionState} pathname={pathname} user={user} />
        <SystemNoticeBanner />
        <MobileContextNav pathname={pathname} user={user} />
        <main className="page-main" id="main-content" ref={mainRef} tabIndex={-1}>
          {backHref && !hasLocalBackLink ? <nav aria-label="Điều hướng quay lại" className="page-context-navigation"><BackLink href={backHref} /></nav> : null}
          {children}
        </main>
        {hasChatAccess ? <ChatDock /> : null}
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
