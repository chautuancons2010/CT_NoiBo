"use client";

import { useEffect } from "react";
import Link from "next/link";

import { getBackHref, getRouteMeta } from "@/config/routeRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { UserMenu } from "@/components/shared/UserMenu";
import { MobileAppLauncher } from "@/components/layout/MobileAppLauncher";
import { useBranding, useOrganizationSettings } from "@/components/providers/SystemSettingsProvider";
import { NotificationBell } from "@/features/shared-platforms/components/NotificationBell";
import { MessageBell } from "@/features/messaging/MessageBell";
import { CommandPalette } from "@/features/search/components/CommandPalette";
import type { RealtimeConnectionState } from "@/lib/realtime/coordinator";
import { can } from "@/lib/auth/permissions";
import { BackLink } from "@/components/shared/BackLink";
import { AppLogo } from "@/components/layout/AppLogo";
import { Avatar } from "@/components/shared/Avatar";

export interface AppHeaderProps {
  pathname: string;
  user: AuthenticatedUser;
  connectionState: RealtimeConnectionState;
  backHrefOverride?: string | null;
}

const connectionLabels: Record<RealtimeConnectionState, string> = {
  connected: "",
  connecting: "",
  reconnecting: "Đang thử kết nối lại…",
  degraded: "Kết nối realtime không ổn định",
  offline: "Mất kết nối"
};

export function AppHeader({ pathname, user, connectionState, backHrefOverride }: AppHeaderProps) {
  const branding = useBranding();
  const organization = useOrganizationSettings();
  const routeMeta = getRouteMeta(pathname);
  const meta = /^\/projects\/[^/]+\/(?:today|progress|team|profile|documents)$/.test(pathname)
    ? { ...routeMeta, title: routeMeta.title.split(" · ").at(-1) ?? routeMeta.title }
    : routeMeta;
  const isRootScreen = ["/dashboard", "/home", "/personal", "/applications", "/messages", "/notifications", "/profile"].includes(pathname);
  const backHref = isRootScreen ? null : backHrefOverride ?? getBackHref(pathname) ?? "/applications";

  useEffect(() => {
    document.title = `${meta.title} | ${branding.systemName}`;
  }, [branding.systemName, meta.title]);

  return (
    <header className={`app-header ${isRootScreen ? "app-header--root" : "app-header--detail"}`}>
      <div className="app-header__mobile-leading">
        {backHref ? (
          <BackLink
            className="app-header__mobile-back"
            href={backHref}
            iconOnly
            label="Quay lại"
          />
        ) : <><span className="app-header__mobile-logo"><AppLogo compact href="/personal" label="Về Cá nhân" /></span>{isRootScreen ? <span className="app-header__mobile-brand">{organization.shortName}</span> : null}</>}
        <strong className={isRootScreen ? "sr-only" : "app-header__mobile-title"}>{meta.title}</strong>
      </div>
      <div className="app-header__search"><CommandPalette key={pathname} user={user} /></div>
      <div className="app-header__actions">
        {connectionLabels[connectionState] ? (
          <span aria-label={connectionLabels[connectionState]} className={`connection-status is-${connectionState}`} title={connectionLabels[connectionState]}>
            <i aria-hidden="true" /><span>{connectionLabels[connectionState]}</span>
          </span>
        ) : null}
        {can(user.permissions, "chat.access") ? <MessageBell /> : null}
        <NotificationBell accountId={user.id} />
        <Link aria-label="Tài khoản" className="app-header__mobile-profile" href="/profile"><Avatar imageUrl="/api/v1/workspace/avatar" name={user.displayName} /></Link>
        <UserMenu user={user} />
        <MobileAppLauncher user={user} variant="more" />
      </div>
    </header>
  );
}
