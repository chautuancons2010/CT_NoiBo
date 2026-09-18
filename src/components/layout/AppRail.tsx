"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import type { CSSProperties } from "react";

import { AppLogo } from "@/components/layout/AppLogo";
import { navigationIconMap } from "@/components/layout/icons";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { IconButton } from "@/components/shared/Button";
import { isNavigationItemActive } from "@/config/navigation";
import { applicationForPath, contextualNavigationGroups } from "@/config/moduleRegistry";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";

interface AppRailProps {
  pathname: string;
  user: AuthenticatedUser;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
}

export function AppRail({ pathname, user, collapsed, onCollapsedChange }: AppRailProps) {
  const { settings } = useSystemSettings();
  const application = applicationForPath(pathname);
  const groups = contextualNavigationGroups(pathname, user, settings.modules, settings.navigation);

  return (
    <aside
      className={cn("app-rail", collapsed && "is-collapsed")}
      aria-label={`Điều hướng ${application.label}`}
      style={{ "--current-app-accent": application.accentColor } as CSSProperties}
    >
      <div className="app-rail__brand"><AppLogo compact /></div>
      <nav className="app-rail__nav">
        {groups.map((group) => (
          <ul key={group.label}>
            {group.label !== application.label && group.label !== "Tổng quan" && !collapsed ? <li className="app-rail__section-label">{group.label}</li> : null}
            {group.items.map((item) => {
              const Icon = navigationIconMap[item.icon];
              const active = isNavigationItemActive(pathname, item);
              return (
                <li key={item.href}>
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={cn("app-rail__link", active && "is-active")}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                  >
                    <Icon aria-hidden="true" size={19} />
                    {!collapsed ? <span>{item.label}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        ))}
      </nav>
      <div className="app-rail__footer">
        <IconButton
          className="app-rail__collapse"
          label={collapsed ? "Mở rộng điều hướng" : "Thu gọn điều hướng"}
          onClick={() => onCollapsedChange(!collapsed)}
        >
          {collapsed ? <PanelLeftOpen aria-hidden="true" size={18} /> : <PanelLeftClose aria-hidden="true" size={18} />}
        </IconButton>
      </div>
    </aside>
  );
}
