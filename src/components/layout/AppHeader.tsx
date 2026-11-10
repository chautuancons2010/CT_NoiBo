"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { getRouteMeta } from "@/config/routeRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { UserMenu } from "@/components/shared/UserMenu";
import { MobileAppLauncher } from "@/components/layout/MobileAppLauncher";
import { useBranding, useOrganizationSettings } from "@/components/providers/SystemSettingsProvider";
import { NotificationBell } from "@/features/shared-platforms/components/NotificationBell";
import { MessageBell } from "@/features/messaging/MessageBell";
import { CommandPalette } from "@/features/search/components/CommandPalette";
import type { RealtimeConnectionState } from "@/lib/realtime/coordinator";
import { can } from "@/lib/auth/permissions";
import { AppLogo } from "@/components/layout/AppLogo";
import { ApplicationMenu } from "@/components/layout/ApplicationMenu";
import { HeaderTestControl } from "@/features/testing/HeaderTestControl";
import chrome from "./ApplicationChrome.module.css";

export interface AppHeaderProps {
  pathname: string;
  user: AuthenticatedUser;
  connectionState: RealtimeConnectionState;
  backHrefOverride?: string | null;
  pageTitleOverride?: string;
  documentTitleOverride?: string;
  homeHref?: string;
  mobileHomeHref?: string;
  sidebarCollapsed?: boolean;
  onSidebarToggle?: () => void;
  testEnvironment?: string;
}

const connectionLabels: Record<RealtimeConnectionState, string> = {
  connected: "",
  connecting: "",
  reconnecting: "Đang thử kết nối lại…",
  degraded: "Đồng bộ định kỳ",
  offline: "Mất kết nối"
};

export function isMobileHeaderRootScreen(pathname: string) {
  return ["/dashboard", "/home", "/personal", "/applications", "/messages", "/notifications", "/profile"].includes(pathname);
}

export function AppHeader({ pathname, user, connectionState, pageTitleOverride, documentTitleOverride, homeHref = "/personal", mobileHomeHref = "/personal", testEnvironment }: AppHeaderProps) {
  const branding = useBranding();
  const organization = useOrganizationSettings();
  const routeMeta = getRouteMeta(pathname);
  const meta = /^\/projects\/[^/]+\/(?:today|progress|team|profile|documents)$/.test(pathname)
    ? { ...routeMeta, title: routeMeta.title.split(" · ").at(-1) ?? routeMeta.title }
    : routeMeta;
  const parentTitle = getRouteMeta(pathname.slice(0, pathname.lastIndexOf("/"))).title;
  const routeTitle = meta.title === "Không tìm thấy" ? parentTitle === "Không tìm thấy" ? "Ứng dụng" : parentTitle : meta.title;
  const mobileTitle = pageTitleOverride ?? routeTitle;

  useEffect(() => {
    const title = `${documentTitleOverride ?? pageTitleOverride ?? routeTitle} | ${branding.systemName}`;
    const updateTitle = () => { if (document.title !== title) document.title = title; };
    updateTitle();
    const observer = new MutationObserver(updateTitle);
    observer.observe(document.head, { childList: true, subtree: true, characterData: true });
    return () => observer.disconnect();
  }, [branding.systemName, documentTitleOverride, pageTitleOverride, routeTitle]);

  return (
    <header className={`app-header app-header--compact app-header--root ${chrome.header}`}>
      <div className="app-header__desktop-leading">
        <ApplicationMenu />
        <nav aria-label="Vị trí hiện tại" className="app-header__context">
          {pathname === homeHref ? <span aria-current="page">Trang chủ</span> : <><Link href={homeHref}>Trang chủ</Link><ChevronRight aria-hidden="true" size={13} /><span aria-current="page" title={mobileTitle}>{mobileTitle}</span></>}
        </nav>
      </div>
      <div className="app-header__mobile-leading">
        <MobileAppLauncher key={pathname} user={user} variant="brand" />
        <span className="app-header__mobile-logo"><AppLogo compact href={mobileHomeHref} label="Về trang chủ" /></span>
        <span className="app-header__mobile-brand">{organization.shortName}</span>
      </div>
      <div className="app-header__search"><CommandPalette key={pathname} user={user} /></div>
      <div className="app-header__actions">
        {testEnvironment ? <HeaderTestControl currentUsername={user.username} environment={testEnvironment} key={pathname} /> : null}
        {connectionLabels[connectionState] ? (
          <span aria-label={connectionLabels[connectionState]} className={`connection-status is-${connectionState}`} title={connectionState === "degraded" ? "Kết nối trực tiếp chưa ổn định; dữ liệu đang được kiểm tra định kỳ." : connectionLabels[connectionState]}>
            <i aria-hidden="true" /><span>{connectionLabels[connectionState]}</span>
          </span>
        ) : null}
        {can(user.permissions, "chat.access") ? <MessageBell /> : null}
        <NotificationBell accountId={user.id} />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
