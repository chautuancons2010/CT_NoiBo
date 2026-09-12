"use client";

import Link from "next/link";

import {
  filterNavigationByPermissions,
  isNavigationItemActive,
  mobileNavigation
} from "@/config/navigation";
import type { AuthenticatedUser } from "@/lib/auth/permissions";
import { cn } from "@/lib/utils/cn";
import { navigationIconMap } from "@/components/layout/icons";
import { useSystemSettings } from "@/components/providers/SystemSettingsProvider";
import { isPathEnabled } from "@/config/systemSettings";

export interface MobileBottomNavProps {
  pathname: string;
  user: AuthenticatedUser;
}

export function MobileBottomNav({ pathname, user }: MobileBottomNavProps) {
  const { settings } = useSystemSettings();
  const items = filterNavigationByPermissions(mobileNavigation, user.permissions)
    .filter((item) => isPathEnabled(item.href, settings.modules))
    .slice(0, 5);

  return (
    <nav aria-label="Điều hướng mobile" className="mobile-bottom-nav">
      {items.map((item) => {
        const Icon = navigationIconMap[item.icon];
        const active = isNavigationItemActive(pathname, item);

        return (
          <Link
            aria-current={active ? "page" : undefined}
            className={cn("mobile-bottom-nav__item", active && "is-active")}
            href={item.href}
            key={item.href}
          >
            <Icon aria-hidden="true" size={19} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
