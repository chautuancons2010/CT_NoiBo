"use client";

import { Bell, Search } from "lucide-react";
import Link from "next/link";

import { getBreadcrumbs, getRouteMeta } from "@/config/routeRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { UserMenu } from "@/components/shared/UserMenu";
import { Breadcrumb } from "@/components/layout/Breadcrumb";

export interface AppHeaderProps {
  pathname: string;
  user: AuthenticatedUser;
  online: boolean;
}

export function AppHeader({ pathname, user, online }: AppHeaderProps) {
  const meta = getRouteMeta(pathname);
  const breadcrumbs = getBreadcrumbs(pathname);

  return (
    <header className="app-header">
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
