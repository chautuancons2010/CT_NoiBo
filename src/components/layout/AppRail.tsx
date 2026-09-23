"use client";

import Link from "next/link";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";

import { AppLogo } from "@/components/layout/AppLogo";
import { navigationIconMap, navigationIconSizes } from "@/components/layout/icons";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { IconButton } from "@/components/shared/Button";
import { Tooltip } from "@/components/shared/Primitives";
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
  const navigationRef = useRef<HTMLElement>(null);

  useEffect(() => {
    // Contextual menus can have a different length on each route. Resetting avoids
    // rendering the new function halfway down a menu that was scrolled previously.
    navigationRef.current?.scrollTo?.({ top: 0, behavior: "auto" });
  }, [pathname]);

  return (
    <aside
      className={cn("app-rail", collapsed && "is-collapsed")}
      aria-label={`Điều hướng ${application.label}`}
      style={{ "--current-app-accent": application.accentColor } as CSSProperties}
    >
      <div className="app-rail__brand"><AppLogo compact /></div>
      <nav className="app-rail__nav" ref={navigationRef}>
        {groups.map((group) => (
          <ul key={group.label}>
            {group.label !== application.label && group.label !== "Tổng quan" ? <li aria-label={collapsed ? group.label : undefined} className="app-rail__section-label">{collapsed ? null : group.label}</li> : null}
            {group.items.map((item) => {
              const Icon = navigationIconMap[item.icon];
              const active = isNavigationItemActive(pathname, item);
              const link = (
                <Link
                  aria-label={collapsed ? item.label : undefined}
                  aria-current={active ? "page" : undefined}
                  className={cn("app-rail__link", active && "is-active")}
                  href={item.href}
                >
                  <Icon aria-hidden="true" size={navigationIconSizes.rail} />
                  {!collapsed ? <span>{item.label}</span> : null}
                </Link>
              );
              return <li key={item.href}>{collapsed ? <Tooltip className="app-rail__tooltip" content={item.label} placement="right" portal>{link}</Tooltip> : link}</li>;
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
          {collapsed ? <PanelLeftOpen aria-hidden="true" size={navigationIconSizes.control} /> : <PanelLeftClose aria-hidden="true" size={navigationIconSizes.control} />}
        </IconButton>
      </div>
    </aside>
  );
}
