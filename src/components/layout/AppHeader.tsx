"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

import { getBreadcrumbs, getRouteMeta } from "@/config/routeRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { UserMenu } from "@/components/shared/UserMenu";
import { Breadcrumb } from "@/components/layout/Breadcrumb";
import { AppLogo } from "@/components/layout/AppLogo";
import { useBranding } from "@/components/providers/SystemSettingsProvider";

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
        <div className="header-search" role="search">
          <Search aria-hidden="true" size={17} />
          <input aria-label="Tìm kiếm toàn hệ thống" placeholder="Tìm kiếm" type="search" />
        </div>
        <span className={online ? "connection-status" : "connection-status is-offline"}>
          {online ? "Online" : "Offline"}
        </span>
        <Link aria-label="Thông báo" className="icon-link" href="/notifications" title="Thông báo">
          <Bell aria-hidden="true" size={18} />
        </Link>
        <UserMenu user={user} />
      </div>
    </header>
  );
}
