"use client";

import { useEffect } from "react";

import { getBreadcrumbs, getRouteMeta } from "@/config/routeRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { UserMenu } from "@/components/shared/UserMenu";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { AppLogo } from "@/components/layout/AppLogo";
import { useBranding } from "@/components/providers/SystemSettingsProvider";
import { NotificationBell } from "@/features/shared-platforms/components/NotificationBell";
import { CommandPalette } from "@/features/search/components/CommandPalette";

export interface AppHeaderProps {
  pathname: string;
  user: AuthenticatedUser;
  online: boolean;
}

export function AppHeader({ pathname, user, online }: AppHeaderProps) {
  const branding = useBranding();
  const meta = getRouteMeta(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  useEffect(() => {
    document.title = `${meta.title} | ${branding.systemName}`;
  }, [branding.systemName, meta.title]);

  return (
    <header className="app-header">
      <div className="app-header__mobile-logo"><AppLogo compact /></div>
      <div className="app-header__title">
        <Breadcrumb items={breadcrumbs} />
        <h1>{meta.title}</h1>
      </div>
      <div className="app-header__actions">
        <CommandPalette user={user} />
        <span className={online ? "connection-status" : "connection-status is-offline"}>
          {online ? "Online" : "Offline"}
        </span>
        <NotificationBell />
        <UserMenu user={user} />
      </div>
    </header>
  );
}
