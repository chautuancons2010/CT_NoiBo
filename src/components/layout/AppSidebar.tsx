"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  isNavigationItemActive
} from "@/config/navigation";
import { applicationForPath, contextualNavigationGroups } from "@/config/moduleRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";
import { IconButton } from "@/components/shared/Button";
import { AppLogo } from "@/components/layout/AppLogo";
import { navigationIconMap } from "@/components/layout/icons";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { Grid3X3 } from "lucide-react";

export interface AppSidebarProps {
  pathname: string;
  user: AuthenticatedUser;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AppSidebar({
  pathname,
  user,
  collapsed,
  onCollapsedChange
}: AppSidebarProps) {
  const { settings } = useSystemSettings();
  const groups = contextualNavigationGroups(pathname, user, settings.modules, settings.navigation);
  const application = applicationForPath(pathname);

  return (
    <aside className={cn("app-sidebar", collapsed && "is-collapsed")} aria-label="Điều hướng chính">
      <div className="app-sidebar__top">
        <AppLogo compact={collapsed} />
        <IconButton
          className="sidebar-collapse"
          label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" size={18} /> : <PanelLeftClose aria-hidden="true" size={18} />}
        </IconButton>
      </div>
      <div className="app-sidebar__nav">
        <Link className="sidebar-apps-link" href="/workspace">
          <Grid3X3 aria-hidden="true" size={18} />
          {!collapsed ? <span>Tất cả ứng dụng</span> : null}
        </Link>
        {!collapsed ? <div className="sidebar-context"><span>Ứng dụng hiện tại</span><strong>{application.label}</strong></div> : null}
        {groups.map((group) => (
          <details className="nav-group" key={group.label} open>
            {!collapsed ? <summary>Chức năng</summary> : null}
            <ul>
              {group.items.map((item) => {
                const Icon = navigationIconMap[item.icon];
                const active = isNavigationItemActive(pathname, item);

                return (
                  <li key={item.href}>
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={cn("nav-link", active && "is-active")}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                    >
                      <Icon aria-hidden="true" size={18} />
                      {!collapsed ? <span>{item.label}</span> : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </details>
        ))}
      </div>
    </aside>
  );
}
