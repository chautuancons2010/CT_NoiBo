"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import {
  desktopNavigation,
  filterGroupsByPermissions,
  isNavigationItemActive
} from "@/config/navigation";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";
import { IconButton } from "@/components/shared/Button";
import { AppLogo } from "@/components/layout/AppLogo";
import { navigationIconMap } from "@/components/layout/icons";

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
  const groups = filterGroupsByPermissions(desktopNavigation, user.permissions);

  return (
    <aside className={cn("app-sidebar", collapsed && "is-collapsed")} aria-label="Điều hướng chính">
      <div className="app-sidebar__top">
        <AppLogo compact={collapsed} />
        <IconButton
          label={collapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" size={18} /> : <PanelLeftClose aria-hidden="true" size={18} />}
        </IconButton>
      </div>
      <div className="app-sidebar__nav">
        {groups.map((group) => (
          <section className="nav-group" key={group.label}>
            {!collapsed ? <h2>{group.label}</h2> : null}
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
          </section>
        ))}
      </div>
    </aside>
  );
}
